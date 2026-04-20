#!/usr/bin/env node
/**
 * build-portfolio-public.mjs
 *
 * Merges Convex structural data + hand-written overrides + local history files
 * into a single sanitized JSON for the public portfolio page.
 *
 * Runs via `prebuild` hook (and manually during development).
 *
 * Privacy invariants (enforced by preflight check post-run):
 *   - NO quantity / avgCost / totalCost / targetAmount absolute values
 *   - NO per-account ¥/$ figures
 *   - Percentages, sector tags, thesis, stage, status OK
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
// Workspace root: rexliu-website/../.. — works on both Mac Mini (~/clawd/) and
// MacBook (~/Clawd Workspace/) since the script is located identically under
// projects/rexliu-website/scripts/ on each machine.
const WORKSPACE_ROOT = path.resolve(ROOT, "../..");

// ─── Paths ───────────────────────────────────────────────
const OVERRIDES_PATH = path.join(ROOT, "src/data/portfolio-overrides.json");
const OUTPUT_PATH = path.join(ROOT, "src/data/portfolio-public.json");
const THERMOMETER_HISTORY = path.join(WORKSPACE_ROOT, "output/research/investment-strategy/macro/thermometer-history.jsonl");
const WATCHLIST_INDEX = path.join(WORKSPACE_ROOT, "output/research/investment-strategy/macro/watchlist-scan-index.json");
const TRADELOG_INDEX = path.join(WORKSPACE_ROOT, "output/research/trade-log/archive/index.json");

const CONVEX_URL = "https://fleet-heron-880.convex.cloud";
const FETCH_TIMEOUT_MS = 15000;

// ─── Small utilities ─────────────────────────────────────

async function readJson(filepath, fallback = null) {
  try {
    const buf = await fs.readFile(filepath, "utf8");
    return JSON.parse(buf);
  } catch (err) {
    console.warn(`  ⚠️  Cannot read ${filepath}: ${err.code || err.message}`);
    return fallback;
  }
}

async function readJsonl(filepath, fallback = []) {
  try {
    const buf = await fs.readFile(filepath, "utf8");
    return buf.split("\n").filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    console.warn(`  ⚠️  Cannot read ${filepath}: ${err.code || err.message}`);
    return fallback;
  }
}

async function convexQuery(path, args = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args, format: "json" }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.status === "error") throw new Error(data.errorMessage);
    return data.value;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`  ⚠️  Convex ${path} failed: ${err.message}`);
    return null;
  }
}

// ─── Regime transform ────────────────────────────────────

function buildRegime(history, fallback) {
  const parsed = history
    .filter((r) => r.date && r.signals)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Current: latest in history, else fallback
  let current;
  if (parsed.length > 0) {
    const latest = parsed[parsed.length - 1];
    const signals = {};
    for (const [k, v] of Object.entries(latest.signals || {})) {
      if (!v) continue;
      // Fallback to the hand-edited override value (e.g. Policy → "胶着")
      // when the thermometer scrape doesn't produce a numeric/string value
      // for this signal — avoids a bare "-" on the page.
      const fallbackValue = fallback?.signals?.[k]?.value;
      let value = formatSignalValue(k, v);
      if ((value === "-" || value === "") && fallbackValue) value = fallbackValue;
      signals[k] = {
        label: labelForSignal(k),
        value,
        light: v.light || fallback?.signals?.[k]?.light || "yellow",
      };
    }
    current = {
      label: latest.regime || "中性期",
      label_en: regimeEn(latest.regime),
      aggression: latest.aggression || "中",
      green_count: latest.green_count ?? 0,
      total_signals: latest.total_signals ?? 5,
      signals,
    };
  } else if (fallback) {
    current = {
      label: fallback.regime.label,
      label_en: fallback.regime.label_en,
      aggression: fallback.regime.aggression,
      green_count: fallback.regime.green_count,
      total_signals: 5,
      signals: fallback.signals,
    };
  }

  // History for chart (last 60 days). Include per-signal light so the page
  // can render a 5-signals × N-days grid when the line-chart doesn't have
  // enough points yet (< 7 days).
  const history60d = parsed.slice(-60).map((r) => {
    const lights = {};
    for (const [k, v] of Object.entries(r.signals || {})) {
      if (v && v.light) lights[k] = v.light;
    }
    return {
      date: r.date,
      regime: r.regime,
      green_count: r.green_count,
      vix: r.signals?.vix?.value ?? null,
      lights,
    };
  });

  return { current, history_60d: history60d };
}

function labelForSignal(key) {
  return ({
    tnx: "10Y UST",
    dxy: "DXY",
    vix: "VIX",
    naaim: "NAAIM",
    policy: "Policy",
  })[key] || key;
}

function formatSignalValue(key, v) {
  if (v.value == null) return "-";
  if (key === "tnx") return `${v.value}%`;
  if (key === "policy") return v.status || "-";
  return `${v.value}`;
}

function regimeEn(label) {
  return ({ 进攻期: "Offensive", 中性期: "Neutral", 防御期: "Defensive" })[label] || label;
}

// ─── Watchlist heatmap transform ─────────────────────────

function buildHeatmap(index) {
  if (!index || !index.tickers) return null;
  // Keep last 30 days, pad/trim
  const maxDays = 30;
  const dates = (index.dates || []).slice(-maxDays);
  const scores = (index.scores || []).slice(-maxDays);
  const statuses = (index.statuses || []).slice(-maxDays);
  return {
    tickers: index.tickers,
    ticker_names: index.ticker_names || {},
    dates,
    scores,
    statuses,
  };
}

// ─── Positions transform ─────────────────────────────────

function buildPositions(convexPositions, convexRules, convexEvents, overrides) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC

  const rulesBySymbol = {};
  for (const r of convexRules || []) {
    (rulesBySymbol[r.symbol] = rulesBySymbol[r.symbol] || []).push(r);
  }
  // Only keep future events (eventDate >= today)
  const futureEvents = (convexEvents || []).filter((e) => (e.eventDate || "") >= today);
  const eventsBySymbol = {};
  for (const e of futureEvents) {
    (eventsBySymbol[e.symbol] = eventsBySymbol[e.symbol] || []).push(e);
  }

  const flagMap = { cn: "🇨🇳", hk: "🇭🇰", us: "🇺🇸" };
  const marketOrder = { us: 0, hk: 1, cn: 2 };

  const positions = (convexPositions || []).map((p) => {
    const override = overrides.positions?.[p.symbol] || {};
    const rules = rulesBySymbol[p.symbol] || [];
    const events = (eventsBySymbol[p.symbol] || []).sort((a, b) => (a.eventDate < b.eventDate ? -1 : 1));

    // Distance to stop: use stop_loss or technical_stop rule, express as % (not $)
    const stopRule = rules.find((r) => r.ruleType === "stop_loss" || r.ruleType === "technical_stop");
    let stop = null;
    if (stopRule && p.lastPrice && stopRule.value) {
      const pct = ((p.lastPrice - Number(stopRule.value)) / p.lastPrice) * 100;
      let severity = "gray";
      if (pct < 10) severity = "red";
      else if (pct < 20) severity = "yellow";
      stop = {
        type: stopRule.ruleType,
        level_pct_from_current: `+${pct.toFixed(1)}%`,
        severity,
        description: stopRule.description || null,
      };
    }

    const nextEvent = events[0]
      ? {
          date: events[0].eventDate,
          label: events[0].event,
          urgency: events[0].urgency || 2,
        }
      : null;

    return {
      symbol: p.symbol,
      market: p.market,
      flag: flagMap[p.market] || "🏳️",
      sector_tags_en: override.sector_tags_en || [],
      sector_tags_zh: override.sector_tags_zh || [],
      thesis_en: override.thesis_en || "",
      thesis_zh: override.thesis_zh || "",
      stage: override.stage ?? 7,
      status_en: override.status_en || "Active",
      status_zh: override.status_zh || "持有中",
      conviction: override.conviction || "medium",
      horizon: override.horizon || "long",
      entry_year: override.entry_year ?? null,
      stop,
      next_event: nextEvent,
    };
  });

  positions.sort((a, b) => {
    const mo = (marketOrder[a.market] ?? 9) - (marketOrder[b.market] ?? 9);
    return mo !== 0 ? mo : a.symbol.localeCompare(b.symbol);
  });

  return positions;
}

// ─── Main ────────────────────────────────────────────────

async function hasWorkspaceExternalData() {
  // At least one of the 3 external data sources must exist for a meaningful
  // rebuild. In CI (GitHub Actions checks out only the rexliu-website repo),
  // none of them are present — regenerating in that case silently wipes
  // the committed portfolio-public.json (clearances/history/heatmap all go
  // to []) and the live site renders empty sections. When no external data
  // is available, trust the committed JSON as the canonical snapshot.
  const probes = [THERMOMETER_HISTORY, WATCHLIST_INDEX, TRADELOG_INDEX];
  for (const p of probes) {
    try {
      await fs.access(p);
      return true;
    } catch {
      /* missing */
    }
  }
  return false;
}

async function main() {
  console.log("🔧 Building portfolio-public.json\n");

  // 0. CI guard: skip rebuild when external workspace data isn't accessible.
  //    Keeps committed snapshot intact instead of overwriting with empties.
  if (!(await hasWorkspaceExternalData())) {
    console.log(
      "⚠️  No workspace-external data found (thermometer / watchlist / tradelog)."
    );
    console.log(
      "   This is expected in CI. Keeping committed src/data/portfolio-public.json as-is."
    );
    console.log(
      "   Locally, run this script from a full workspace checkout to regenerate."
    );
    return;
  }

  // 1. Load editorial overrides (required)
  const overrides = await readJson(OVERRIDES_PATH);
  if (!overrides) {
    console.error("❌ Missing portfolio-overrides.json — cannot build");
    process.exit(1);
  }

  // 2. Fetch Convex structural data (with fallback to last output if down)
  console.log("📡 Fetching Convex...");
  const [positions, rules, events] = await Promise.all([
    convexQuery("portfolio:listPositions", { status: "active" }),
    convexQuery("portfolio:listMonitorRules", {}),
    convexQuery("portfolio:listMonitorEvents", { status: "pending" }),
  ]);

  // 3. Read local historical files
  console.log("📚 Reading local history...");
  const thermometerHistory = await readJsonl(THERMOMETER_HISTORY);
  const watchlistIndex = await readJson(WATCHLIST_INDEX);
  const tradelog = await readJson(TRADELOG_INDEX);

  // 4. Fallback protection: if Convex failed AND we have a previous output, reuse it
  if (!positions) {
    console.warn("  ⚠️  Convex unavailable — attempting to reuse last portfolio-public.json");
    try {
      const existing = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
      existing.generated_at = new Date().toISOString();
      existing._warning = "Rebuilt with Convex unavailable — positions may be stale";
      await fs.writeFile(OUTPUT_PATH, JSON.stringify(existing, null, 2) + "\n");
      console.log(`✅ Reused stale JSON; wrote ${OUTPUT_PATH}`);
      return;
    } catch {
      console.error("❌ No existing portfolio-public.json to fall back to");
      process.exit(1);
    }
  }

  // 5. Transform + merge
  const regime = buildRegime(thermometerHistory, overrides.macro_signals_fallback);
  const heatmap = buildHeatmap(watchlistIndex);
  // Filter events to future only (consistent with buildPositions)
  const today = new Date().toISOString().slice(0, 10);
  const futureEvents = (events || []).filter((e) => (e.eventDate || "") >= today);

  const publicPositions = buildPositions(positions, rules, events, overrides);
  const clearances = tradelog?.clearances || [];
  const roundtables = overrides.roundtables || [];

  // Aggregate trade stats across clearances
  const totalTrades = clearances.reduce((sum, c) => sum + (c.trade_count || 0), 0);
  const wins = clearances.filter((c) => (c.outcome_pct_rounded ?? 0) > 0).length;
  const totalClosed = clearances.length;
  const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 100) : 0;
  const realizedPnlPct = clearances.reduce((sum, c) => sum + (c.outcome_pct_rounded || 0), 0);

  // Short list: tickers at latest scan score >= 7
  const shortList = (() => {
    if (!watchlistIndex?.scores?.length) return [];
    const lastRow = watchlistIndex.scores.at(-1) || [];
    const out = [];
    (watchlistIndex.tickers || []).forEach((t, i) => {
      if ((lastRow[i] ?? -1) >= 7) {
        out.push({ ticker: t, name: watchlistIndex.ticker_names?.[t] || "", score: lastRow[i] });
      }
    });
    return out;
  })();

  const stats = {
    active_positions: publicPositions.length,
    markets: new Set(publicPositions.map((p) => p.market)).size,
    tracked_rules: (rules || []).filter((r) => r.active !== false).length,
    upcoming_events: futureEvents.length,
    weekly_scan_hits: watchlistIndex
      ? (() => {
          const lastScoresRow = watchlistIndex.scores?.at(-1) || [];
          return lastScoresRow.filter((s) => s >= 5).length;
        })()
      : 0,
    total_trades: totalTrades,
    closed_positions: totalClosed,
    win_rate_pct: winRate,
    realized_pnl_pct: realizedPnlPct,
    days_since_last_clearance: clearances[0]?.exit_date
      ? Math.floor((Date.now() - new Date(clearances[0].exit_date).getTime()) / 86400000)
      : null,
  };

  const output = {
    generated_at: new Date().toISOString(),
    regime,
    allocation: { current: overrides.allocation },
    sector_research: overrides.sector_research || [],
    deep_research: overrides.deep_research || [],
    positions: publicPositions,
    watchlist_heatmap: heatmap,
    short_list: shortList,
    clearances,
    roundtables,
    stats,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`\n✅ Wrote ${OUTPUT_PATH}`);
  console.log(
    `   ${stats.active_positions} positions, ${stats.markets} markets, ${stats.tracked_rules} rules, ${stats.upcoming_events} events, ${regime.history_60d.length}-day regime history, ${heatmap ? heatmap.dates.length : 0}-day heatmap, ${clearances.length} clearances, ${roundtables.length} roundtables`
  );
}

main().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
