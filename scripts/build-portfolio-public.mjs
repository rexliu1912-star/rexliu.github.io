#!/usr/bin/env node
/**
 * build-portfolio-public.mjs
 *
 * Merges Convex structural data (now including display metadata) + optional
 * hand-written overrides (fallback) + local history files into a single
 * sanitized JSON for the public portfolio page.
 *
 * Data priority: Convex field > overrides.json > default value.
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
const ALLOCATION_MODEL_PATH = path.join(ROOT, "src/data/portfolio-model-targets.json");
const CAPITAL_MOBILITY_RISK_PATH = path.join(ROOT, "src/data/capital-mobility-risk.json");
const OUTPUT_PATH = path.join(ROOT, "src/data/portfolio-public.json");
const THERMOMETER_HISTORY = path.join(WORKSPACE_ROOT, "output/research/investment-strategy/macro/thermometer-history.jsonl");
const WATCHLIST_INDEX = path.join(WORKSPACE_ROOT, "output/research/investment-strategy/macro/watchlist-scan-index.json");
const TRADELOG_INDEX = path.join(WORKSPACE_ROOT, "output/research/trade-log/archive/index.json");

const CONVEX_URL = "https://fleet-heron-880.convex.cloud";
const FETCH_TIMEOUT_MS = 15000;
const PRIVATE_PORTFOLIO_PATH = path.join(WORKSPACE_ROOT, "projects/the-workshop/data/portfolio.json");
const CRYPTO_MONITOR_STATE_PATH = path.join(WORKSPACE_ROOT, "data/crypto-monitor-state.json");
const CRYPTO_DCA_STATUS_PATH = path.join(WORKSPACE_ROOT, "data/crypto-dca-status.json");
const MARKET_DATA_DIR = path.join(WORKSPACE_ROOT, "data/market");
const PORTFOLIO_HISTORY_DIR = path.join(WORKSPACE_ROOT, "projects/the-workshop/data/portfolio-history");
const CRYPTO_PORTFOLIO_HISTORY_PATH = path.join(WORKSPACE_ROOT, "projects/the-workshop/data/portfolio-crypto-history.json");
const BOTTOM_TRACKER_PATH = path.join(WORKSPACE_ROOT, "projects/crypto-bottom-tracker/web_data.json");
const TIMESERIES_PATH = path.join(WORKSPACE_ROOT, "data/crypto-timeseries.json");
const NEWS_DIGEST_PATH = path.join(WORKSPACE_ROOT, "data/portfolio-news-digest.json");
const DAILY_SNAPSHOT_DIR = path.join(WORKSPACE_ROOT, "output/research/investment-strategy/portfolio/snapshots");
const GOLD_TRACKER_PATH = path.join(WORKSPACE_ROOT, "data/gold-tracker.json");
const GOLD_TIMESERIES_PATH = path.join(WORKSPACE_ROOT, "data/gold-timeseries.json");

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

function applyAllocationModel(overrides, allocationModel) {
  const allocation = JSON.parse(JSON.stringify(overrides.allocation || { categories: [] }));
  const modelById = new Map((allocationModel?.categories || []).map((category) => [category.id, category]));

  allocation.model = allocationModel
    ? {
        schema: allocationModel._meta?.schema || null,
        version: allocationModel._meta?.version || null,
        generated_at: allocationModel._meta?.generated_at || null,
        regime: allocationModel.regime || null,
      }
    : null;
  allocation.risk_free_rate = allocationModel?.risk_free_rate_pct ?? 3;
  allocation.categories = (allocation.categories || []).map((category) => {
    const modelCategory = modelById.get(category.id);
    if (!modelCategory) return category;
    return {
      ...category,
      target_pct: modelCategory.target_pct ?? category.target_pct,
      model_target_pct: modelCategory.target_pct ?? category.target_pct,
      raw_model_target_pct: modelCategory.raw_target_pct ?? null,
      signal_score: modelCategory.signal_score ?? null,
      expected_return_pct: modelCategory.expected_return_pct ?? category.expected_return_pct,
      annual_volatility_pct: modelCategory.annual_volatility_pct ?? category.annual_volatility_pct,
      current_pct: modelCategory.current_pct ?? category.current_pct,
      drift_pp: modelCategory.drift_pp ?? category.drift_pp,
      model_action: modelCategory.action || null,
      model_rationale_en: modelCategory.rationale_en || null,
      model_rationale_zh: modelCategory.rationale_zh || null,
      model_current_pct: modelCategory.current_pct ?? null,
      model_drift_pp: modelCategory.drift_pp ?? null,
    };
  });
  return allocation;
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

/**
 * Find the latest market data file in MARKET_DATA_DIR.
 * Tries today's date first, then walks back up to 7 days.
 * Returns { filepath, dateStr } or null.
 */
async function findLatestMarketData() {
  const dir = MARKET_DATA_DIR;
  try {
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    if (jsonFiles.length === 0) return null;
    // Pick the most recent file (last in sorted order)
    const latest = jsonFiles[jsonFiles.length - 1];
    return { filepath: path.join(dir, latest), dateStr: latest.replace(".json", "") };
  } catch {
    return null;
  }
}

/**
 * Build monthly allocation history from portfolio-history directory.
 * Returns { history: [...] } or { history: [] } on error.
 */
async function buildAllocationHistory(privatePortfolio = null) {
  // Non-investable categories excluded from allocation base
  const NON_INVESTABLE = new Set(["note"]);
  // 按有知有行分类：
  // Funds = 银行+余额宝+微信+高端稳健+买房基金+教育基金+应收
  // Stocks = 且慢+未来世代(非黄金部分)+A股个股+美股
  // Stablecoin = 稳定生息
  // Crypto = 加密永生+加密交易
  // Gold = 从未来世代拆出的国泰黄金ETF
  const BUCKET_AGG = {
    stablecoin: ["stablecoin"],
    funds: ["liquid", "yanerhigh", "house", "education", "receivable"],
    gold: [], // computed dynamically from future.breakdown
    stocks: ["qieman", "future", "rex_stock", "us_stock"],
    crypto: ["crypto", "crypto_ivy"],
  };

  try {
    const files = await fs.readdir(PORTFOLIO_HISTORY_DIR);
    const jsonFiles = files.filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort();

    const history = [];
    for (const file of jsonFiles) {
      const data = await readJson(path.join(PORTFOLIO_HISTORY_DIR, file));
      if (!data || !data.breakdown) continue;
      const breakdownKeys = Object.keys(data.breakdown).filter((k) => k !== "note");
      if (breakdownKeys.length === 0) continue;

      // Investable base = total minus non-investable categories
      const investable = Object.entries(data.breakdown)
        .filter(([k]) => !NON_INVESTABLE.has(k))
        .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
      if (investable <= 0) continue;

      const buckets = {};
      for (const [destKey, srcKeys] of Object.entries(BUCKET_AGG)) {
        const val = srcKeys.reduce((s, k) => s + (Number(data.breakdown[k]) || 0), 0);
        if (val > 0) {
          buckets[destKey] = Math.round((val / investable) * 100);
        }
      }
      // Extract gold from stocks' future portion
      // For history snapshots without breakdown, use current ratio as estimate
      const futureVal = Number(data.breakdown.future) || 0;
      if (futureVal > 0) {
        // Try to get gold from breakdown sub-structure (current data)
        const futureBreakdown = data.breakdown_future || data.future_breakdown;
        let goldVal = 0;
        if (futureBreakdown && futureBreakdown["国泰黄金ETF_A"]) {
          goldVal = Number(futureBreakdown["国泰黄金ETF_A"].amount) || 0;
        } else {
          // Fallback: use current privatePortfolio gold ratio for history estimates
          const goldRatio = privatePortfolio?.assets?.find(a => a.id === "future")?.breakdown?.["国泰黄金ETF_A"]?.amount;
          const futureCurrent = privatePortfolio?.assets?.find(a => a.id === "future")?.amount;
          if (goldRatio && futureCurrent && futureCurrent > 0) {
            goldVal = Math.round(futureVal * (goldRatio / futureCurrent));
          }
        }
        if (goldVal > 0) {
          const goldPct = Math.round((goldVal / investable) * 100);
          const stockPctOld = buckets.stocks || 0;
          if (stockPctOld > goldPct) {
            buckets.gold = goldPct;
            buckets.stocks = stockPctOld - goldPct;
          }
        }
      }

      const dateMonth = file.replace(".json", "");
      history.push({
        date: dateMonth,
        total_net_worth_wan: data.totalNetWorthWan ?? Math.round(investable / 10000),
        buckets,
      });
    }
    return { history };
  } catch (err) {
    console.warn(`  ⚠️  Cannot build allocation history: ${err.message}`);
    return { history: [] };
  }
}


// ─── Crypto Portfolio Value Index ────────────────────────
/**
 * Build crypto portfolio value index from daily history.
 * Returns { data: [...], metrics: {...} } or null.
 * All monetary values are normalized to index (base=100) — no absolute amounts exposed.
 */
async function buildCryptoPortfolioHistory() {
  try {
    const raw = await fs.readFile(CRYPTO_PORTFOLIO_HISTORY_PATH, "utf-8").catch(() => null);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const daily = parsed.daily || [];
    if (daily.length < 2) return null;

    const baseTotal = daily[0].total;
    if (!baseTotal || baseTotal <= 0) return null;

    // Build index data (sample every 3 days to keep JSON lean)
    const sampled = [];
    for (let i = 0; i < daily.length; i += 3) {
      sampled.push(daily[i]);
    }
    // Always include the last entry
    if (sampled[sampled.length - 1] !== daily[daily.length - 1]) {
      sampled.push(daily[daily.length - 1]);
    }

    const data = sampled.map((d) => ({
      date: d.date,
      index: Math.round((d.total / baseTotal) * 10000) / 100,
    }));

    // Calculate metrics
    const totals = daily.map((d) => d.total);
    // Max drawdown: largest peak-to-trough decline anywhere in history
    let runningMax = totals[0];
    let maxDD = 0;
    for (const t of totals) {
      if (t > runningMax) runningMax = t;
      const dd = (t - runningMax) / runningMax;
      if (dd < maxDD) maxDD = dd;
    }
    const maxDrawdownPct = Math.round(maxDD * 10000) / 100;

    // Current drawdown: from all-time high to today
    const maxVal = Math.max(...totals);
    const currentVal = totals[totals.length - 1];
    const currentDrawdownPct = Math.round(((currentVal - maxVal) / maxVal) * 10000) / 100;

    // Daily returns for BTC beta and annualized volatility
    const dailyReturns = [];
    for (let i = 1; i < daily.length; i++) {
      if (daily[i - 1].total > 0) {
        dailyReturns.push((daily[i].total - daily[i - 1].total) / daily[i - 1].total);
      }
    }

    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, r) => a + (r - avgReturn) ** 2, 0) / dailyReturns.length;
    const dailyVol = Math.sqrt(variance);
    const annualizedVolatility = Math.round(dailyVol * Math.sqrt(365) * 10000) / 100;

    // BTC beta: correlate portfolio returns with BTC price changes
    const btcAssets = daily.map((d) => d.assets?.BTC || 0);
    let btcBeta = 0;
    if (btcAssets.length > 30) {
      const btcReturns = [];
      for (let i = 1; i < btcAssets.length; i++) {
        if (btcAssets[i - 1] > 0) {
          btcReturns.push((btcAssets[i] - btcAssets[i - 1]) / btcAssets[i - 1]);
        }
      }
      if (btcReturns.length > 20) {
        const n = Math.min(dailyReturns.length, btcReturns.length);
        const pr = dailyReturns.slice(-n);
        const br = btcReturns.slice(-n);
        const pAvg = pr.reduce((a, b) => a + b, 0) / n;
        const bAvg = br.reduce((a, b) => a + b, 0) / n;
        let cov = 0, bVar = 0;
        for (let i = 0; i < n; i++) {
          cov += (pr[i] - pAvg) * (br[i] - bAvg);
          bVar += (br[i] - bAvg) ** 2;
        }
        cov /= n;
        bVar /= n;
        btcBeta = bVar > 0 ? Math.round((cov / bVar) * 100) / 100 : 0;
      }
    }

    return {
      data,
      metrics: {
        max_drawdown_pct: maxDrawdownPct,
        current_drawdown_pct: currentDrawdownPct,
        btc_beta: btcBeta,
        annualized_volatility: annualizedVolatility,
      },
    };
  } catch (e) {
    console.warn(`   ⚠️  Portfolio history: ${e.message}`);
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
    const signalDetails = {};
    for (const [k, v] of Object.entries(r.signals || {})) {
      if (v && v.light) lights[k] = v.light;
      if (v) signalDetails[k] = { value: v.value, light: v.light || 'gray', status: v.status || null };
    }
    return {
      date: r.date,
      regime: r.regime,
      green_count: r.green_count,
      aggression: r.aggression || null,
      vix: r.signals?.vix?.value ?? null,
      lights,
      signalDetails,
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

function buildHeatmap(index, quantRatings) {
  if (!index || !index.tickers) return null;
  // Keep last 30 days, pad/trim
  const maxDays = 30;
  const dates = (index.dates || []).slice(-maxDays);
  const scores = (index.scores || []).slice(-maxDays);
  const statuses = (index.statuses || []).slice(-maxDays);
  const registryCount = index.registry_count || Object.keys(index.ticker_meta || {}).length || index.tickers.length;

  // Enrich ticker_meta with quant rating factors
  const enrichedMeta = JSON.parse(JSON.stringify(index.ticker_meta || {}));
  if (quantRatings) {
    const ratings = quantRatings.ratings || {};
    for (const ticker of index.tickers) {
      // Strip yfinance suffix (.SS/.SZ/.HK) for matching against quant-ratings keys
      const stripped = ticker.replace(/\.(SS|SZ|HK)$/, "");
      // Try: raw ticker → stripped → with common suffixes
      const candidates = [ticker, stripped, stripped + ".SS", stripped + ".SZ", stripped + ".HK"];
      let match = null;
      for (const c of candidates) {
        if (ratings[c]) { match = ratings[c]; break; }
      }
      if (match) {
        if (!enrichedMeta[ticker]) enrichedMeta[ticker] = {};
        // Normalize factor keys: backend uses dividendSafety, frontend expects dividend
        const factors = { ...match.factors };
        if (factors.dividendSafety && !factors.dividend) {
          factors.dividend = factors.dividendSafety;
          delete factors.dividendSafety;
        }
        enrichedMeta[ticker].quant = {
          composite: match.composite,
          rating: match.rating,
          score: match.composite,
          factors,
        };
      }
    }
  }

  return {
    source: index.source || "watchlist-scan-index",
    registry_file: index.registry_file ? "investment-strategy/macro/watchlist-registry.json" : null,
    registry_count: registryCount,
    eligible_count: index.eligible_count || index.tickers.length,
    tickers: index.tickers,
    ticker_names: index.ticker_names || {},
    ticker_meta: enrichedMeta,
    dates,
    scores,
    statuses,
  };
}

// ─── Crypto sanitize transform ───────────────────────────

/**
 * Strip sensitive fields from private portfolio crypto data.
 * Output is safe for the public website.
 *
 * Privacy invariants:
 *   - NO amount / sources / source_values (per-exchange balances)
 *   - NO dust assets (value < $1)
 *   - Stablecoin aggregated as bucket-level summary only
 *   - Portfolio % calculated against totalAssets (private CNY→USD conversion is NOT
 *     done here — we use the raw crypto.total / private totalAssets ratio, which is
 *     correct because both are already in USD).
 */
function sanitizeCrypto(privatePortfolio) {
  const crypto = privatePortfolio?.crypto;
  if (!crypto?.assets?.length) return null;

  const PUBLIC_SYMBOLS = ["BTC", "SNEK"];

  // Static thesis data — public-facing, no sensitive info
  const THESIS = {
    BTC: {
      tags_en: ["Digital Gold", "Macro Uncertainty Hedge"],
      tags_zh: ["数字黄金", "宏观对冲"],
      thesis_en: "Non-derivative bet on sovereign money. DCA through bottom-tracker signals — the system doesn't predict price, it detects accumulation windows.",
      thesis_zh: "非衍生品的货币主权押注。通过底部追踪信号 DCA——系统不预测价格，只判断建仓窗口。",
      strategy_en: "Bottom Tracker",
      strategy_zh: "底部追踪",
      driver_factors_en: ["Liquidity", "USD", "Regulation"],
      driver_factors_zh: ["流动性", "美元", "监管"],
    },
    SNEK: {
      tags_en: ["Cardano Ecosystem", "Community", "Meme"],
      tags_zh: ["Cardano 生态", "社区驱动", "Meme"],
      thesis_en: "Cardano ecosystem proxy. Managed by community sentiment, KOL activity, and on-chain health — not traditional TA.",
      thesis_zh: "Cardano 生态敞口。看社区热度、KOL 活跃度和链上健康度，不走传统技术分析。",
      strategy_en: "Signal-Driven",
      strategy_zh: "信号驱动",
      driver_factors_en: ["Cardano Liquidity", "Community Momentum", "Regulation"],
      driver_factors_zh: ["Cardano 流动性", "社区动能", "监管"],
    },
  };

  // Non-stablecoin positions — no dollar amounts, no percentages, no prices
  const positions = crypto.assets
    .filter((a) => PUBLIC_SYMBOLS.includes(a.symbol) && (a.value || 0) >= 1)
    .map((a) => ({
      symbol: a.symbol,
      role: a.symbol === "BTC" ? "core" : "community",
      ...THESIS[a.symbol],
    }));

  return {
    updated_at: crypto.lastUpdated || privatePortfolio.lastUpdated,
    positions,
  };
}

// ─── Monitor state sanitize transform ───────────────────

/**
 * Extract public-safe fields from crypto-monitor-state.json.
 *
 * Privacy invariants:
 *   - NO total_assets_usd / stablecoin value_usd / crypto value_usd (absolute $)
 *   - NO individual stablecoin asset details
 *   - Pct, status, signals, conditions — all safe
 */
function sanitizeMonitorState(monitorState, dcaStatus, marketData = null, bottomTrackerData = null) {
  if (!monitorState) return null;

  const alloc = monitorState.allocation || {};
  const macro = monitorState.macro || {};
  const dca = monitorState.dca || {};
  const stable = monitorState.stablecoin_health || {};
  const snek = monitorState.snek || {};
  const ds = monitorState.data_sources || {};

  // Extract 8 bottom tracker indicators — enrich with EN names + cleaned detail
  const IND_META = {
    "市场极度恐慌": { en: "Fear & Greed Index", desc_en: "Crypto market sentiment composite (0–100)", desc_zh: "加密市场情绪综合指数（0–100）" },
    "矿工投降": { en: "Miner Capitulation", desc_en: "BTC drawdown from ATH + miner revenue stress", desc_zh: "BTC 距高点回撤 + 矿工收入压力" },
    "黑天鹅强度": { en: "Black Swan Intensity", desc_en: "Multi-factor tail-risk model (BSS)", desc_zh: "多因子尾部风险模型（BSS）" },
    "宏观股市熊市": { en: "Macro VIX", desc_en: "S&P 500 implied volatility", desc_zh: "标普500隐含波动率" },
    "场外资金储备": { en: "OTC Reserve (SSR)", desc_en: "Stablecoin Supply Ratio — off-exchange liquidity", desc_zh: "稳定币供应比率 — 场外流动性" },
    "MVRV Z-Score": { en: "MVRV Z-Score", desc_en: "Market-to-Realized Value ratio (deviation from historical mean)", desc_zh: "市值/已实现价值比（偏离历史均值程度）" },
    "BTC ETF资金流": { en: "BTC ETF Flow", desc_en: "Daily net inflow/outflow of spot BTC ETFs (USD millions)", desc_zh: "BTC 现货 ETF 每日净流入/流出（百万美元）" },
    "美元指数DXY": { en: "Dollar Index (DXY)", desc_en: "US Dollar strength — inverse correlation with BTC", desc_zh: "美元强度 — 与 BTC 负相关" },
  };
  const statusScore = { green: 80, yellow: 50, red: 20 };
  const bottomTrackerIndicators = (bottomTrackerData?.indicators || []).map((ind) => {
    const meta = IND_META[ind.name] || {};
    // Clean detail: strip emoji + redact USD amounts + trailing parenthetical context label
    let cleanDetail = (ind.data || ind.fullText || "").replace(/[\u{1F7E0}\u{1F7E1}\u{1F534}\u{1F7E2}\u{2705}\u{274C}\u{2B50}]\s*/gu, "").trim();
    cleanDetail = cleanDetail.replace(/\$\d[\d,.]*/g, "$XX,XXX");
    // Extract change value BEFORE stripping (for CHG column)
    const deltaMatch = cleanDetail.match(/[,，]?\s*变化[:：]?\s*([+-]?\d+\.?\d*)/);
    const delta = deltaMatch ? parseFloat(deltaMatch[1]) : null;
    // Strip trailing change value (变化:+N or 变化:-N) — that goes to CHG column
    let detailBase = cleanDetail.replace(/[,，]?\s*变化[:：]?\s*[+-]?\d+\.?\d*/g, "").trim();
    // Strip outer parentheses if wrapping the whole string
    detailBase = detailBase.replace(/^\s*[（(](.*)[)）]\s*$/, "$1").trim().replace(/,\s*$/, "").trim();
    // Bilingual detail: split Chinese and English versions
    const detail_zh = detailBase
      .replace(/[(（][A-Za-z0-9:/$%,.\s+\-]+[)）]/g, "")  // remove parenthetical English/Chinese
      .replace(/[\u4e00-\u9fff]+[(（][^)）]*[)）]/g, (m) => m.replace(/[(（][^)）]*[)）]/g, ""))  // 移除中文后的括号
      .replace(/\s+/g, " ").trim().replace(/,?\s*$/, "");
    const detail_en = detailBase
      .replace(/当前/g, "Current").replace(/回撤/g, "Drawdown").replace(/价格/g, "Price")
      .replace(/场外充裕/g, "Abundant OTC").replace(/严重低估/g, "Severely Undervalued")
      .replace(/资金中性/g, "Neutral Flow")
      .replace(/美元偏弱（利好风险）/g, "Weak USD (risk-on)")
      .replace(/美元偏弱/g, "Weak USD")
      .replace(/[\u4e00-\u9fff（）]+/g, "")  // strip remaining Chinese
      .replace(/\(([A-Za-z0-9:/$%,.\s+\-]+)\)/g, "$1")  // unwrap parenthetical English
      .replace(/,\s*$/, "").replace(/\s+/g, " ").trim() || detailBase;
    return {
      name_zh: ind.name,
      name_en: meta.en || ind.name,
      status: ind.status,
      score: ind.score ?? statusScore[ind.status] ?? 50,
      detail_en,
      detail_zh,
      delta,
      desc_en: meta.desc_en || "",
      desc_zh: meta.desc_zh || "",
    };
  });

  // Extract ETF flow from bottom tracker indicators (for side card)
  const etfIndicator = (bottomTrackerData?.indicators || []).find((i) => i.name === "BTC ETF资金流" || i.name?.includes("ETF"));
  const etfFlowMatch = etfIndicator?.data?.match(/(-?\d+(?:\.\d+)?)[MmBb]/);
  const etfFlowValue = etfFlowMatch ? parseFloat(etfFlowMatch[1]) : null;

  // Extract FGI 7-day history from market data file
  const fgiHistory7d = marketData?.sections?.macro?.fear_greed?.history_7d || null;

  // Build action signals from allocation gaps + DCA status
  const signals = [];
  const cryptoAlloc = alloc.crypto || {};
  const stableAlloc = alloc.stablecoin || {};

  if (cryptoAlloc.status === "underweight") {
    const dcaStatus2 = dcaStatus || dca.dca || {};
    signals.push({
      priority: Math.abs(cryptoAlloc.gap_pp || 0) > 5 ? 1 : 2,
      type: "crypto_underweight",
      detail: `Crypto ${cryptoAlloc.pct}% (target ${cryptoAlloc.target_pct}%), DCA ${dcaStatus2.status || dca.dca?.status || "unknown"}`,
    });
  } else if (cryptoAlloc.status === "overweight") {
    signals.push({
      priority: 1,
      type: "crypto_overweight",
      detail: `Crypto ${cryptoAlloc.pct}% exceeds target ${cryptoAlloc.target_pct}%`,
    });
  }

  if (stableAlloc.gap_pp && Math.abs(stableAlloc.gap_pp) > 3) {
    signals.push({
      priority: Math.abs(stableAlloc.gap_pp) > 5 ? 1 : 2,
      type: stableAlloc.gap_pp > 0 ? "stablecoin_overweight" : "stablecoin_underweight",
      detail: `Stablecoin ${stableAlloc.pct}% (target ${stableAlloc.target_pct}%)`,
    });
  }

  if (stable.depeg_alerts?.length > 0) {
    signals.push({
      priority: 0,
      type: "depeg_alert",
      detail: `${stable.depeg_alerts.length} stablecoin depeg alert(s)`,
    });
  }

  // Sort by priority (lower = more urgent)
  signals.sort((a, b) => a.priority - b.priority);

  return {
    generated_at: monitorState.generated_at || null,
    data_freshness: {
      market_data_available: ds.market_data_available || false,
      bottom_tracker_available: ds.bottom_tracker_available || false,
      dca_status_available: ds.dca_status_available || false,
      market_data_date: ds.market_data_date || null,
    },
    allocation: {
      crypto: {
        pct: cryptoAlloc.pct ?? null,
        target_pct: cryptoAlloc.target_pct ?? null,
        gap_pp: cryptoAlloc.gap_pp ?? null,
        status: cryptoAlloc.status || null,
      },
      stablecoin: {
        pct: stableAlloc.pct ?? null,
        target_pct: stableAlloc.target_pct ?? null,
        gap_pp: stableAlloc.gap_pp ?? null,
        status: stableAlloc.status || null,
      },
    },
    macro: {
      fear_greed: macro.fear_greed ?? null,
      fear_greed_7d: fgiHistory7d,
      btc_change_24h: macro.btc_change_24h ?? null,
      signals: (macro.signals || []).slice(0, 5),
    },
    bottom_tracker: {
      score: bottomTrackerData?.weightedScore ?? bottomTrackerData?.weighted_score ?? dca.bottom_tracker?.weighted_score ?? null,
      status: bottomTrackerData?.marketStatus || bottomTrackerData?.market_status || dca.bottom_tracker?.status || null,
      indicators: bottomTrackerIndicators,
    },
    etf: {
      btc_etf_net_flow_m: etfFlowValue,
      etfs: [], // granular per-fund data not available from current source
    },
    dca: {
      status: dcaStatus?.status || dca.dca?.status || null,
      score: dcaStatus?.score ?? dca.dca?.score ?? null,
      met_count: dcaStatus?.met_count ?? null,
      min_required: dcaStatus?.min_required ?? null,
      reason: dcaStatus?.reason || dca.dca?.reason || null,
      conditions: (dcaStatus?.conditions || dca.dca?.conditions || []).map((c) => ({
        id: c.id,
        met: c.met || false,
        detail: c.detail || null,
      })),
      updated_at: dcaStatus?.updated_at || dca.dca?.updated_at || null,
    },
    stablecoin_health: {
      apy_current_pct: stable.apy_current_pct ?? null,
      depeg_alerts: stable.depeg_alerts || [],
      chain_supply_status: stable.chain_supply_usd ? "normal" : null,
    },
    snek: {
      has_position: snek.has_position || false,
      signals: (snek.signals || []).slice(0, 5),
      note: snek.note || null,
    },
    action_signals: signals,
  };
}

// ─── Positions transform ─────────────────────────────────

function redactDollarAmounts(text) {
  if (!text || typeof text !== "string") return text || null;
  return text.replace(/\$\s*\d[\d,.]*/g, "$XX,XXX");
}

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
        level_pct_from_current: `-${pct.toFixed(1)}%`,
        severity,
        description: stopRule.description || null,
      };
    }

    // Target price: severity=warning is primary 12M target, severity=info is optimistic
    const targetRules = rules.filter((r) => r.ruleType === "target_price");
    const primaryTarget = targetRules.find((r) => r.severity === "warning");
    const optimisticTarget = targetRules.find((r) => r.severity === "info");
    let target = null;
    if (primaryTarget) {
      const targetPrice = Number(primaryTarget.value);
      const refPrice = p.lastPrice || p.avgCost;
      const pctAway = refPrice
        ? ((targetPrice - refPrice) / refPrice) * 100
        : null;
      target = {
        price_pct_from_current: pctAway !== null ? `+${pctAway.toFixed(1)}%` : null,
        description: redactDollarAmounts(primaryTarget.description) || null,
        optimistic_price: optimisticTarget ? null : null,
      };
    }

    const nextEvent = events[0]
      ? {
          date: events[0].eventDate,
          label: redactDollarAmounts(events[0].event),
          urgency: events[0].urgency || 2,
        }
      : null;

    return {
      symbol: p.symbol,
      market: p.market,
      flag: flagMap[p.market] || "🏳️",
      sector_tags_en: p.sectorTagsEn || override.sector_tags_en || [],
      sector_tags_zh: p.sectorTagsZh || override.sector_tags_zh || [],
      driver_factors_en: override.driver_factors_en || [],
      driver_factors_zh: override.driver_factors_zh || [],
      thesis_en: p.thesisEn || override.thesis_en || "",
      thesis_zh: p.thesisZh || override.thesis_zh || "",
      stage: p.stage ?? override.stage ?? 7,
      status_en: p.statusEn || override.status_en || "Active",
      status_zh: p.statusZh || override.status_zh || "持有中",
      conviction: p.conviction || override.conviction || "medium",
      horizon: p.horizon || override.horizon || "long",
      entry_year: p.entryYear ?? override.entry_year ?? null,
      layer: p.layer || override.layer || null,
      layer_label_en: p.layerLabelEn || override.layer_label_en || null,
      layer_label_zh: p.layerLabelZh || override.layer_label_zh || null,
      stop,
      target,
      next_event: nextEvent,
    };
  });

  positions.sort((a, b) => {
    const mo = (marketOrder[a.market] ?? 9) - (marketOrder[b.market] ?? 9);
    return mo !== 0 ? mo : a.symbol.localeCompare(b.symbol);
  });

  return positions;
}

// ─── Closed positions from Convex trades ─────────────────

function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.max(0, Math.round((end - start) / 86400000));
}

function roundPct(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function stripTradeQuantityFromNote(note) {
  if (!note) return note;
  return String(note)
    .replace(/\b(sell|sold)\s+\d[\d,]*(?:\.\d+)?\s*@\s*/gi, "sold at ")
    .replace(/\b(buy|bought)\s+\d[\d,]*(?:\.\d+)?\s*@\s*/gi, "bought at ")
    .replace(/\b(\d[\d,]*(?:\.\d+)?)\s+shares?\s*@\s*/gi, "at ")
    .replace(/\b(\d[\d,]*(?:\.\d+)?)\s*股\s*@\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactTradeNotes(trades) {
  return [
    ...new Set((trades || []).map((t) => stripTradeQuantityFromNote(t.note)).filter(Boolean)),
  ].join(" · ");
}

function buildAutoTradePoints(sortedTrades, metrics = {}) {
  if (!sortedTrades.length) return [];
  const buys = sortedTrades.filter((t) => String(t.side || "").toLowerCase() === "buy");
  const sells = sortedTrades.filter((t) => String(t.side || "").toLowerCase() === "sell");
  const points = [];

  if (buys.length) {
    const firstBuy = buys[0];
    const avgBuy = metrics.avgEntryPrice ?? null;
    const notes = compactTradeNotes(buys);
    points.push({
      date: firstBuy.tradeDate,
      kind: "entry",
      action_en: buys.length > 1 ? "Built position" : "Opened position",
      action_zh: buys.length > 1 ? "分批建仓" : "建立仓位",
      price: avgBuy ? +avgBuy.toFixed(4) : null,
      note_en: notes || "Generated from Convex buy records.",
      note_zh: notes || "由 Convex 买入记录生成。",
    });
  }

  if (sells.length) {
    const lastSell = sells[sells.length - 1];
    const avgSell = metrics.avgExitPrice ?? null;
    const notes = compactTradeNotes(sells);
    points.push({
      date: lastSell.tradeDate,
      kind: "exit",
      action_en: sells.length > 1 ? "Closed via staged sells" : "Closed position",
      action_zh: sells.length > 1 ? "分批清仓" : "清仓",
      price: avgSell ? +avgSell.toFixed(4) : null,
      note_en: notes || "Full exit detected from Convex position status.",
      note_zh: notes || "根据 Convex 持仓状态识别为已清仓。",
    });
  }

  return points;
}

function labelTradeNote(note, action, locale = "en") {
  const cleanNote = stripTradeQuantityFromNote(note);
  if (!cleanNote) return cleanNote;
  if (!/^at\s+/i.test(cleanNote) && !/^[$A-Z]{1,4}\$?\d/.test(cleanNote)) return cleanNote;
  const actionText = String(action || "").toLowerCase();
  const isExit = /(exit|closed|清仓|平仓|卖出|退出)/i.test(actionText);
  const isEntry = /(open|entry|opened|建立|建仓|买入)/i.test(actionText);
  if (locale === "zh") {
    if (isExit) return cleanNote.replace(/^at\s+/i, "").replace(/^/, "清仓 ");
    if (isEntry) return cleanNote.replace(/^at\s+/i, "").replace(/^/, "建仓 ");
  }
  if (isExit) return cleanNote.replace(/^at\s+/i, "Exit at ");
  if (isEntry) return cleanNote.replace(/^at\s+/i, "Entry at ");
  return cleanNote;
}

function sanitizeClearanceTradeNotes(clearance) {
  if (!clearance?.trade_points?.length) return clearance;
  return {
    ...clearance,
    trade_points: clearance.trade_points.map((point) => ({
      ...point,
      note_en: labelTradeNote(point.note_en, point.action_en, "en"),
      note_zh: labelTradeNote(point.note_zh, point.action_zh, "zh"),
    })),
  };
}

function buildAutoClearances(convexPositions, convexTrades, overrides) {
  const closedStatuses = new Set(["closed", "cleared"]);
  const tradesByAccountSymbol = new Map();
  for (const trade of convexTrades || []) {
    const key = `${trade.accountId || ""}::${trade.symbol}`;
    const list = tradesByAccountSymbol.get(key) || [];
    list.push(trade);
    tradesByAccountSymbol.set(key, list);
  }

  const out = [];
  for (const position of convexPositions || []) {
    if (!closedStatuses.has(position.status)) continue;
    if (["crypto"].includes(position.market)) continue;

    const symbol = position.symbol;
    const key = `${position.accountId || ""}::${symbol}`;
    const sortedTrades = (tradesByAccountSymbol.get(key) || [])
      .slice()
      .sort((a, b) => (a.tradeDate || "").localeCompare(b.tradeDate || "") || (a._creationTime || 0) - (b._creationTime || 0));
    if (!sortedTrades.length) continue;

    const buys = sortedTrades.filter((t) => String(t.side || "").toLowerCase() === "buy");
    const sells = sortedTrades.filter((t) => String(t.side || "").toLowerCase() === "sell");
    if (!buys.length || !sells.length) continue;

    const boughtQty = buys.reduce((s, t) => s + (Number(t.quantity) || 0), 0);
    const soldQty = sells.reduce((s, t) => s + (Number(t.quantity) || 0), 0);
    if (soldQty + 0.0001 < boughtQty) continue;

    const buyCost = buys.reduce((s, t) => {
      const fee = Number(t.fee) || 0;
      const tax = Number(t.tax) || 0;
      return s + (Number(t.quantity) || 0) * (Number(t.price) || 0) + fee + tax;
    }, 0);
    const sellProceeds = sells.reduce((s, t) => {
      const fee = Number(t.fee) || 0;
      const tax = Number(t.tax) || 0;
      return s + (Number(t.quantity) || 0) * (Number(t.price) || 0) - fee - tax;
    }, 0);
    if (buyCost <= 0) continue;

    const avgEntryPrice = boughtQty > 0 ? buyCost / boughtQty : null;
    const avgExitPrice = soldQty > 0 ? sellProceeds / soldQty : null;
    const entryDate = buys[0].tradeDate;
    const exitDate = sells[sells.length - 1].tradeDate;
    const outcomePct = ((sellProceeds - buyCost) / buyCost) * 100;
    const override = overrides.positions?.[symbol] || {};
    if (override.hide_clearance) continue;

    const watchlistItem = (overrides.watchlist || []).find((item) => item.ticker === symbol) || {};

    out.push({
      ticker: symbol,
      market: position.market,
      name_en: override.name_en || watchlistItem.name_en || symbol,
      name_zh: override.name_zh || watchlistItem.name_zh || symbol,
      sector_tags_en: override.sector_tags_en || [],
      sector_tags_zh: override.sector_tags_zh || [],
      entry_date: entryDate,
      exit_date: exitDate,
      holding_days: daysBetween(entryDate, exitDate),
      outcome_pct: +outcomePct.toFixed(1),
      outcome_pct_rounded: roundPct(outcomePct),
      win_rate_pct: outcomePct > 0 ? 100 : 0,
      trade_count: sortedTrades.length,
      currency: position.currency || buys[0]?.currency || sells[0]?.currency || null,
      avg_entry_price: avgEntryPrice ? +avgEntryPrice.toFixed(4) : null,
      avg_exit_price: avgExitPrice ? +avgExitPrice.toFixed(4) : null,
      reason_en: override.clearance_reason_en || "Auto-generated closed position from Convex trade and position records.",
      reason_zh: override.clearance_reason_zh || "由 Convex 交易与持仓记录自动生成的清仓记录。",
      lesson_en: override.clearance_lesson_en || "Add an editorial lesson in portfolio-overrides clearances only if this exit deserves a manual review.",
      lesson_zh: override.clearance_lesson_zh || "只有值得复盘的清仓，才需要在 portfolio-overrides clearances 里补充人工经验。",
      article_url: override.clearance_article_url || null,
      trade_points: buildAutoTradePoints(sortedTrades, { avgEntryPrice, avgExitPrice }),
    });
  }

  return out;
}

function mergeClearances(localClearances, autoClearances) {
  const byTicker = new Map();
  for (const local of localClearances || []) {
    if (!local?.ticker) continue;
    byTicker.set(local.ticker, { ...local });
  }

  for (const auto of autoClearances || []) {
    const existing = byTicker.get(auto.ticker);
    if (!existing) {
      byTicker.set(auto.ticker, auto);
      continue;
    }

    byTicker.set(auto.ticker, {
      ...existing,
      ...auto,
      // Convex trade/position records are the source of truth for mechanics.
      // Local clearances are editorial only; do not let stale local round trips
      // overwrite dates, P&L, prices, counts, currency, or generated trade points.
      market: auto.market || existing.market,
      entry_date: auto.entry_date || existing.entry_date,
      exit_date: auto.exit_date || existing.exit_date,
      holding_days: auto.holding_days ?? existing.holding_days,
      outcome_pct: auto.outcome_pct ?? existing.outcome_pct,
      outcome_pct_rounded: auto.outcome_pct_rounded ?? existing.outcome_pct_rounded,
      win_rate_pct: auto.win_rate_pct ?? existing.win_rate_pct,
      trade_count: auto.trade_count ?? existing.trade_count,
      currency: auto.currency || existing.currency,
      avg_entry_price: auto.avg_entry_price ?? existing.avg_entry_price,
      avg_exit_price: auto.avg_exit_price ?? existing.avg_exit_price,
      trade_points: auto.trade_points?.length ? auto.trade_points : existing.trade_points,
    });
  }

  return [...byTicker.values()].sort((a, b) => (b.exit_date || "").localeCompare(a.exit_date || ""));
}

// ─── Main ────────────────────────────────────────────────

async function hasWorkspaceExternalData() {
  // At least one of the 3 external data sources must exist for a meaningful
  // rebuild. In CI (GitHub Actions checks out only the rexliu-website repo),
  // none of them are present — regenerating in that case silently wipes
  // the committed portfolio-public.json (clearances/history/heatmap all go
  // to []) and the live site renders empty sections. When no external data
  // is available, trust the committed JSON as the canonical snapshot.
  const probes = [THERMOMETER_HISTORY, WATCHLIST_INDEX, TRADELOG_INDEX, PRIVATE_PORTFOLIO_PATH];
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

  // 1. Load editorial overrides (required) + generated allocation model (optional)
  const overrides = await readJson(OVERRIDES_PATH);
  if (!overrides) {
    console.error("❌ Missing portfolio-overrides.json — cannot build");
    process.exit(1);
  }
  const allocationModel = await readJson(ALLOCATION_MODEL_PATH, null);
  const allocationConfig = applyAllocationModel(overrides, allocationModel);
  if (allocationModel) {
    console.log(`🧠 Allocation model: ${allocationModel.regime?.name || "unknown"} score=${allocationModel.regime?.score ?? "n/a"}`);
  } else {
    console.warn("   ⚠️  No allocation model output — falling back to portfolio-overrides allocation");
  }

  // 2. Fetch Convex structural data (with fallback to last output if down)
  console.log("📡 Fetching Convex...");
  const [positions, trades, rules, events] = await Promise.all([
    convexQuery("portfolio:listPositions", {}),
    convexQuery("portfolio:listTrades", {}),
    convexQuery("portfolio:listMonitorRules", {}),
    convexQuery("portfolio:listMonitorEvents", { status: "pending" }),
  ]);

  // 3. Read local historical files
  console.log("📚 Reading local history...");
  const thermometerHistory = await readJsonl(THERMOMETER_HISTORY);
  const watchlistIndex = await readJson(WATCHLIST_INDEX);
  const tradelog = await readJson(TRADELOG_INDEX);

  // 3b. Read private portfolio for crypto data
  console.log("🔐 Reading private portfolio (crypto)...");
  const privatePortfolio = await readJson(PRIVATE_PORTFOLIO_PATH);
  const crypto = sanitizeCrypto(privatePortfolio);
  if (crypto) {
    console.log(`   ✅ Crypto: ${crypto.positions.length} positions`);
  } else {
    console.warn("   ⚠️  No crypto data in private portfolio — crypto section will be empty");
  }

  // 3c. Read crypto monitor state + DCA status + market data
  console.log("📊 Reading crypto monitor state...");
  const [monitorState, dcaStatus] = await Promise.all([
    readJson(CRYPTO_MONITOR_STATE_PATH),
    readJson(CRYPTO_DCA_STATUS_PATH),
  ]);

  // Read latest market data for ETF and FGI history
  const latestMarketInfo = await findLatestMarketData();
  const marketData = latestMarketInfo ? await readJson(latestMarketInfo.filepath) : null;

  // Read bottom tracker indicators
  const bottomTrackerRaw = await readJson(BOTTOM_TRACKER_PATH).catch(() => null);

  const cryptoMonitor = sanitizeMonitorState(monitorState, dcaStatus, marketData, bottomTrackerRaw);
  if (cryptoMonitor) {
    console.log(`   ✅ Monitor: ${cryptoMonitor.action_signals.length} action signal(s), DCA ${cryptoMonitor.dca.status}`);
    // Derive four-bucket overview from allocation categories (model-enriched when available)
    const allocCats = allocationConfig?.categories || [];
    cryptoMonitor.buckets = allocCats.map((c) => ({
      id: c.id,
      label_en: c.label_en || c.id,
      label_zh: c.label_zh || c.id,
      current_pct: c.current_pct ?? c.pct ?? null,
      target_pct: c.target_pct ?? null,
      drift_pp: c.drift_pp ?? null,
      color: c.color || "#6366f1",
      sub_tags_en: (c.sub_tags_en || []).slice(0, 3),
      sub_tags_zh: (c.sub_tags_zh || []).slice(0, 3),
    }));

    // Add ETF data from market data
    if (marketData?.sections?.etf) {
      const etfSection = marketData.sections.etf;
      cryptoMonitor.etf = {
        btc_etf_net_flow_m: etfSection.btc_etf_net_flow_m ?? null,
        btc_etf_total_volume_m: etfSection.btc_etf_total_volume_m ?? null,
        source: etfSection.source || null,
        etfs: (etfSection.etfs || []).map((e) => ({
          ticker: e.ticker,
          volume_usd_m: e.volume_usd_m ?? null,
        })),
        date: latestMarketInfo?.dateStr || null,
      };
      console.log(`   ✅ ETF: net flow $${etfSection.btc_etf_net_flow_m}M, ${etfSection.etfs?.length || 0} funds`);
    }
  } else {
    console.warn("   ⚠️  No monitor state — crypto management section will be empty");
  }

  // Add timeseries data (BTC price + FGI history) for master chart
  let cryptoTimeseries = null;
  try {
    const tsRaw = await fs.readFile(TIMESERIES_PATH, "utf-8").catch(() => null);
    if (tsRaw) {
      const ts = JSON.parse(tsRaw);
      const tsData = ts.data || [];
      cryptoTimeseries = {
        generated_at: ts.generated_at,
        latest: ts.latest || {},
        data: tsData.slice(-150).map((d) => ({
          date: d.date,
          btc_close: d.btc_close ?? null,
          btc_high: d.btc_high ?? null,
          btc_low: d.btc_low ?? null,
          fgi: d.fgi ?? null,
          fgi_label: d.fgi_label ?? null,
          composite: d.composite ?? null,
          delta_composite: d.delta_composite ?? null,
        })),
      };
      console.log(`   ✅ Timeseries: ${cryptoTimeseries.data.length} days BTC + FGI`);
    }
  } catch (e) {
    console.warn(`   ⚠️  Timeseries: ${e.message}`);
  }

  // Enrich Miner Capitulation indicator with real ATH drawdown from timeseries
  if (cryptoTimeseries?.data?.length >= 2 && cryptoMonitor?.bottom_tracker?.indicators) {
    const prices = cryptoTimeseries.data.map(d => d.btc_close).filter(p => p != null);
    if (prices.length > 0) {
      const ath = Math.max(...prices);
      const current = prices[prices.length - 1];
      const prev = prices[prices.length - 2];
      const drawdownPct = ((current - ath) / ath * 100).toFixed(1);
      const dailyChg = prev ? ((current - prev) / prev * 100).toFixed(1) : null;
      
      // Find and update the Miner Capitulation indicator
      const minerInd = cryptoMonitor.bottom_tracker.indicators.find(
        ind => ind.name_zh === "矿工投降" || ind.name_en === "Miner Capitulation"
      );
      if (minerInd) {
        minerInd.detail_en = `Drawdown: ${drawdownPct}%`;
        minerInd.detail_zh = `回撤: ${drawdownPct}%`;
        minerInd.delta = dailyChg ? parseFloat(dailyChg) : null;
      }
    }
  }

  // Public crypto positions intentionally expose thesis/role only.
  // Prices are not real-time enough for Active Positions cards; keep price data
  // inside the Crypto Intelligence timeseries panel instead of attaching it here.

  // SNEK Daily website content was retired: the frontend no longer renders
  // src/content/snek-daily, and the daily job now writes local archives + Telegram only.
  // Do not enrich public portfolio data from stale website markdown files.

  // Build crypto portfolio value index
  const cryptoPortfolioHistory = await buildCryptoPortfolioHistory();
  if (cryptoPortfolioHistory) {
    console.log(`   ✅ Portfolio index: ${cryptoPortfolioHistory.data.length} data points`);
  }

  // 3d. Build allocation history (monthly)
  console.log("📈 Building allocation history...");
  const allocationHistory = await buildAllocationHistory(privatePortfolio);
  if (allocationHistory.history.length > 0) {
    console.log(`   ✅ Allocation history: ${allocationHistory.history.length} months`);
  } else {
    console.warn("   ⚠️  No allocation history data available");
  }

  // Read gold tracker data
  const goldTrackerRaw = await readJson(GOLD_TRACKER_PATH);
  const goldTracker = goldTrackerRaw ? {
    generated_at: goldTrackerRaw.generated_at,
    price: goldTrackerRaw.price,
    technical: goldTrackerRaw.technical,
    monetary: goldTrackerRaw.monetary,
    cost_floor: goldTrackerRaw.cost_floor,
    premium: goldTrackerRaw.premium,
    signal: goldTrackerRaw.signal,
  } : null;
  if (goldTracker) {
    console.log(`   ✅ Gold: $${goldTracker.price?.xau_usd} | M2 $${goldTracker.monetary?.m2_trillion}T | ${goldTracker.signal?.status}`);
  } else {
    console.log("   ⚠️  No gold tracker data — gold section will be empty");
  }

  // Read gold timeseries
  const goldTimeseries = await readJson(GOLD_TIMESERIES_PATH);
  if (goldTimeseries?.data?.length) {
    console.log(`   📈 Gold timeseries: ${goldTimeseries.data.length} days`);
  }

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
  // Load quant ratings for factor-level heatmap enrichment
  let quantRatings = null;
  try {
    const qrPath = path.join(MARKET_DATA_DIR, "quant-ratings.json");
    quantRatings = JSON.parse(await fs.readFile(qrPath, "utf-8"));
  } catch { /* quant ratings not yet generated */ }
  const heatmap = buildHeatmap(watchlistIndex, quantRatings);
  // Filter events to future only (consistent with buildPositions)
  const today = new Date().toISOString().slice(0, 10);
  const futureEvents = (events || []).filter((e) => (e.eventDate || "") >= today);

  const activePositions = (positions || []).filter((p) => p.status === "active");
  const publicPositions = buildPositions(activePositions, rules, events, overrides);

  // BTC/SNEK live in crypto.positions — remove duplicates from tradfi positions
  const filteredPublicPositions = publicPositions.filter(p => !['BTC', 'SNEK'].includes(p.symbol));

  // 5b. Merge news digest into positions
  const newsDigest = await readJson(NEWS_DIGEST_PATH);
  if (newsDigest?.positions) {
    for (const pos of filteredPublicPositions) {
      const news = newsDigest.positions[pos.symbol];
      if (news) {
        pos.news = {
          summary: news.summary,
          sentiment: news.sentiment, // "positive" | "neutral" | "negative"
          items: (news.items || []).slice(0, 2).map((n) => ({
            title: n.title,
            snippet: n.snippet,
          })),
        };
      }
    }
    const withNews = filteredPublicPositions.filter((p) => p.news).length;
    console.log(`📰 News digest: ${withNews}/${filteredPublicPositions.length} positions`);
  } else {
    console.log("📰 No news digest found — skipping");
  }

  // Merge news into crypto positions from news digest
  if (crypto?.positions && newsDigest?.positions) {
    for (const cp of crypto.positions) {
      const news = newsDigest.positions[cp.symbol];
      if (news) {
        cp.news = {
          summary: news.summary,
          sentiment: news.sentiment,
          items: (news.items || []).slice(0, 2).map((n) => ({ title: n.title, snippet: n.snippet })),
        };
      }
    }
  }

  // 5c. Merge daily snapshot price + daily change into positions
  try {
    const snapshotFiles = (await fs.readdir(DAILY_SNAPSHOT_DIR))
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();
    if (snapshotFiles.length >= 1) {
      const todaySnap = await readJson(path.join(DAILY_SNAPSHOT_DIR, snapshotFiles[0]));
      const yestSnap = snapshotFiles.length >= 2
        ? await readJson(path.join(DAILY_SNAPSHOT_DIR, snapshotFiles[1]))
        : null;
      // Build price maps: symbol → price
      const priceMap = {};
      const yestPriceMap = {};
      for (const snap of [todaySnap].filter(Boolean)) {
        for (const acc of snap.accounts || []) {
          for (const p of acc.positions || []) {
            priceMap[p.symbol] = p.price;
          }
        }
      }
      for (const snap of [yestSnap].filter(Boolean)) {
        for (const acc of snap.accounts || []) {
          for (const p of acc.positions || []) {
            yestPriceMap[p.symbol] = p.price;
          }
        }
      }
      for (const pos of filteredPublicPositions) {
        const price = priceMap[pos.symbol];
        const yestPrice = yestPriceMap[pos.symbol];
        if (price != null) {
          pos.price = price;
          if (yestPrice != null && yestPrice > 0) {
            pos.daily_change_pct = +((price - yestPrice) / yestPrice * 100).toFixed(2);
          }
        }
      }
      const withPrice = filteredPublicPositions.filter((p) => p.price != null).length;
      const snapshotDate = snapshotFiles[0].replace(".json", "");
      console.log(`📊 Snapshot: ${withPrice}/${filteredPublicPositions.length} positions (date: ${snapshotDate})`);
    } else {
      console.log("📊 No daily snapshots found — skipping price merge");
    }
  } catch (err) {
    console.warn(`  ⚠️  Snapshot merge failed: ${err.message}`);
  }

  const autoClearances = buildAutoClearances(positions || [], trades || [], overrides);
  const editorialClearances = [
    ...(overrides.clearances || []),
    ...(tradelog?.clearances || []),
  ];
  const clearances = mergeClearances(editorialClearances, autoClearances).map(sanitizeClearanceTradeNotes);
  if (autoClearances.length > 0) {
    console.log(`🧾 Closed positions: ${autoClearances.length} auto from Convex, ${clearances.length} total after editorial merge`);
  }
  const roundtables = overrides.roundtables || [];
  const capitalMobilityRisk = await readJson(CAPITAL_MOBILITY_RISK_PATH, null);
  if (capitalMobilityRisk) {
    console.log(`🧭 Capital mobility risk: ${capitalMobilityRisk.score}/${capitalMobilityRisk.max_score} ${capitalMobilityRisk.status_en}`);
  }

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
    active_positions: filteredPublicPositions.length,
    markets: new Set(filteredPublicPositions.map((p) => p.market)).size + (crypto?.positions?.length > 0 ? 1 : 0),
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

  // Compute real allocation current_pct from privatePortfolio data
  const computedAllocation = JSON.parse(JSON.stringify(allocationConfig));
  if (privatePortfolio && privatePortfolio.assets) {
    const totalAssets = privatePortfolio.totalAssets || 1;
    // Sum up actual values per bucket using same BUCKET_AGG mapping
    // (import the mapping logic used in buildAllocationHistory)
    const bucketKeys = {
      stablecoin: ["stablecoin"],
      funds: ["liquid", "yanerhigh", "house", "education", "receivable"],
      stocks: ["qieman", "future", "rex_stock", "us_stock"],
      crypto: ["crypto", "crypto_ivy"],
    };
    const assetMap = {};
    for (const a of privatePortfolio.assets) assetMap[a.id] = a.amount || 0;

    const actualPcts = {};
    for (const [bucket, keys] of Object.entries(bucketKeys)) {
      actualPcts[bucket] = keys.reduce((s, k) => s + (assetMap[k] || 0), 0);
    }
    // Gold: extract from future.breakdown
    const futureAsset = privatePortfolio.assets.find(a => a.id === "future");
    const goldAmount = futureAsset?.breakdown?.["国泰黄金ETF_A"]?.amount || 0;
    actualPcts.gold = goldAmount;
    // Subtract gold from stocks (future includes gold)
    actualPcts.stocks -= goldAmount;

    for (const cat of computedAllocation.categories) {
      if (cat.model_current_pct !== undefined && cat.model_current_pct !== null) {
        cat.current_pct = cat.model_current_pct;
        cat.drift_pp = cat.model_drift_pp ?? Math.round((cat.current_pct - cat.target_pct) * 10) / 10;
        const targetAmount = totalAssets * (cat.target_pct / 100);
        const currentAmount = totalAssets * (cat.current_pct / 100);
        cat.gap_amount = Math.round(targetAmount - currentAmount);
      } else if (actualPcts[cat.id] !== undefined) {
        const pct = Math.round((actualPcts[cat.id] / totalAssets) * 1000) / 10; // 1 decimal
        cat.current_pct = pct;
        cat.drift_pp = Math.round((pct - cat.target_pct) * 10) / 10;
        // Gap: how much ¥ to add/reduce to reach target
        const targetAmount = totalAssets * (cat.target_pct / 100);
        cat.gap_amount = Math.round(targetAmount - actualPcts[cat.id]);
      }

      // Dynamic sub-generation for stocks: compute A-share / HK / US split
      // from actual asset amounts instead of hardcoded values.
      if (cat.id === "stocks") {
        const STOCK_MARKET_MAP = {
          rex_stock: "cn",   // A-share individual stocks
          us_stock: "us",    // US individual stocks
          qieman: "cn",      // 且慢 smart advisor (A-share fund composite)
          future: "mixed",   // QDII / mixed — needs sub-breakdown
        };
        const MARKET_LABELS = {
          cn: { label_en: "A-share", label_zh: "A 股" },
          hk: { label_en: "Hong Kong", label_zh: "港股" },
          us: { label_en: "US", label_zh: "美股" },
          mixed: { label_en: "Global Funds", label_zh: "全球基金" },
        };

        // future breakdown → market mapping (excluding gold which is already subtracted)
        const FUTURE_MARKET_MAP = {
          "天弘信息技术ETF": "cn",
          "华宝外科科技": "cn",
          "华夏有色金属ETF": "cn",
          "天弘越南市场": "mixed",
          "天弘中证美互联": "us",
          "创金合信全球互联": "us",
          "摩根纳斯达克100": "us",
          "摩根纳斯达克100_2": "us",
          "摩根标普500": "us",
          "大成纳斯达克100ETF": "us",
          "天弘标普500": "us",
          "嘉实全球产业升级": "mixed",
          "易方达全球精选": "mixed",
          "其他小仓位": "mixed",
        };

        const marketAmounts = { cn: 0, hk: 0, us: 0, mixed: 0 };
        for (const [assetId, mkt] of Object.entries(STOCK_MARKET_MAP)) {
          const amt = assetMap[assetId] || 0;
          if (mkt === "mixed" && assetId === "future") {
            // Break down future by individual fund
            const futureAsset = privatePortfolio.assets.find(a => a.id === "future");
            const bd = futureAsset?.breakdown || {};
            for (const [fundName, fundData] of Object.entries(bd)) {
              if (fundName === "国泰黄金ETF_A") continue; // gold already subtracted from stocks
              const fundAmt = fundData?.amount || 0;
              const fundMkt = FUTURE_MARKET_MAP[fundName] || "mixed";
              marketAmounts[fundMkt] += fundAmt;
            }
          } else if (mkt) {
            marketAmounts[mkt] += amt;
          }
        }

        // Only show markets with actual positions, sorted by amount descending
        const stocksTotal = Object.values(marketAmounts).reduce((s, v) => s + v, 0);
        const sub = Object.entries(marketAmounts)
          .filter(([, amt]) => amt > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([mkt, amt]) => ({
            id: mkt,
            ...MARKET_LABELS[mkt],
            pct: stocksTotal > 0 ? Math.round((amt / totalAssets) * 1000) / 10 : 0,
          }));
        cat.sub = sub;
      }
    }
    // Weighted expected returns
    const targetReturn = computedAllocation.categories.reduce((s, c) => s + (c.target_pct / 100) * (c.expected_return_pct || 0), 0);
    const currentReturn = computedAllocation.categories.reduce((s, c) => s + ((c.current_pct || 0) / 100) * (c.expected_return_pct || 0), 0);
    computedAllocation.weighted_return = {
      target: Math.round(targetReturn * 10) / 10,
      current: Math.round(currentReturn * 10) / 10,
    };
    computedAllocation.projected_annual_yield = Math.round(totalAssets * currentReturn / 100);
    // Portfolio risk (weighted volatility)
    const targetVol = computedAllocation.categories.reduce((s, c) => s + (c.target_pct / 100) * (c.annual_volatility_pct || 0), 0);
    const currentVol = computedAllocation.categories.reduce((s, c) => s + ((c.current_pct || 0) / 100) * (c.annual_volatility_pct || 0), 0);
    // Risk-adjusted return (Sharpe-like)
    const riskFree = computedAllocation.risk_free_rate ?? 3;
    computedAllocation.risk = {
      target_vol: Math.round(targetVol * 10) / 10,
      current_vol: Math.round(currentVol * 10) / 10,
      sharpe_target: targetVol > 0 ? Math.round((targetReturn - riskFree) / targetVol * 100) / 100 : 0,
      sharpe_current: currentVol > 0 ? Math.round((currentReturn - riskFree) / currentVol * 100) / 100 : 0,
      risk_free_rate: riskFree,
    };
    // Temperature: 0-100 scale based on current volatility
    // 0% vol = 0, 30% vol = 50, 60%+ vol = 100
    const tempScore = Math.min(100, Math.round((currentVol / 30) * 50));
    computedAllocation.risk.temperature = tempScore;
    computedAllocation.risk.temperature_label_en = tempScore < 25 ? "Defensive" : tempScore < 50 ? "Conservative" : tempScore < 75 ? "Balanced" : "Aggressive";
    computedAllocation.risk.temperature_label_zh = tempScore < 25 ? "防御型" : tempScore < 50 ? "保守型" : tempScore < 75 ? "均衡型" : "进取型";
    console.log(`   ✅ Risk profile: vol ${currentVol.toFixed(1)}%, temp ${tempScore}, sharpe ${computedAllocation.risk.sharpe_current}`);
  }

  // ── Portfolio Analytics: Health + Beta ──
  let analyticsHistory = [];
  const ANALYTICS_HISTORY_PATH = path.join(MARKET_DATA_DIR, "portfolio-analytics-history.json");
  try {
    analyticsHistory = await readJson(ANALYTICS_HISTORY_PATH, []);
  } catch { /* first run */ }

  let healthScore = quantRatings?.portfolioHealth ?? null;
  let portfolioBeta = null;
  let equityBeta = null;
  try {
    const betaData = await readJson(path.join(MARKET_DATA_DIR, "portfolio-beta.json"), null);
    portfolioBeta = betaData?.portfolio_beta ?? null;
    equityBeta = betaData?.equity_beta ?? null;
  } catch { /* no beta data yet */ }

  // Inject into allocation.current
  computedAllocation.health = healthScore;
  computedAllocation.portfolio_beta = portfolioBeta;
  computedAllocation.equity_beta = equityBeta;

  // Append to history (keep last 90 days)
  const todayStr = new Date().toISOString().slice(0, 10);
  if (healthScore != null || portfolioBeta != null) {
    const lastEntry = analyticsHistory[analyticsHistory.length - 1];
    if (!lastEntry || lastEntry.date !== todayStr) {
      analyticsHistory.push({ date: todayStr, health: healthScore, portfolio_beta: portfolioBeta, equity_beta: equityBeta });
    } else {
      lastEntry.health = healthScore ?? lastEntry.health;
      lastEntry.portfolio_beta = portfolioBeta ?? lastEntry.portfolio_beta;
      lastEntry.equity_beta = equityBeta ?? lastEntry.equity_beta;
    }
    analyticsHistory = analyticsHistory.slice(-90);
    try { await fs.writeFile(ANALYTICS_HISTORY_PATH, JSON.stringify(analyticsHistory, null, 2)); } catch {}
  }

  const output = {
    generated_at: new Date().toISOString(),
    regime,
    allocation: { current: computedAllocation },
    sector_research: overrides.sector_research || [],
    deep_research: overrides.deep_research || [],
    positions: filteredPublicPositions,
    crypto,
    crypto_monitor: cryptoMonitor,
    allocation_history: allocationHistory,
    watchlist_heatmap: heatmap,
    short_list: shortList,
    clearances,
    roundtables,
    stats,
    crypto_portfolio_history: cryptoPortfolioHistory,
    crypto_timeseries: cryptoTimeseries,
    gold_tracker: goldTracker,
    gold_timeseries: goldTimeseries,
    analytics_history: analyticsHistory,
    capital_mobility_risk: capitalMobilityRisk,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`\n✅ Wrote ${OUTPUT_PATH}`);
  console.log(
    `   ${stats.active_positions} positions, ${stats.markets} markets, ${stats.tracked_rules} rules, ${stats.upcoming_events} events, ${regime.history_60d.length}-day regime history, ${heatmap ? heatmap.dates.length : 0}-day heatmap, ${clearances.length} clearances, ${roundtables.length} roundtables, ${allocationHistory.history.length}-month allocation history, health=${healthScore ?? "n/a"}, β=${portfolioBeta ?? "n/a"}`
  );
}

main().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
