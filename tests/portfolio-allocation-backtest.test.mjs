import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const script = path.join(root, "scripts", "portfolio-allocation-backtest.py");
const fixture = path.join(os.tmpdir(), `portfolio-backtest-fixture-${process.pid}.json`);
const out = path.join(os.tmpdir(), `portfolio-backtest-out-${process.pid}.json`);
const report = path.join(os.tmpdir(), `portfolio-backtest-report-${process.pid}.md`);

const dates = Array.from({ length: 45 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 0, 1 + i));
  return d.toISOString().slice(0, 10);
});
const returns = {
  stablecoin: dates.map(() => 0.05 / 365),
  funds: dates.map(() => 0.03 / 365),
  gold: dates.map((_, i) => i < 15 ? 0.001 : i < 30 ? 0.0005 : -0.0002),
  stocks: dates.map((_, i) => i < 15 ? 0.003 : i < 30 ? -0.012 : 0.001),
  crypto: dates.map((_, i) => i < 15 ? 0.006 : i < 30 ? -0.035 : 0.002),
};
const snapshots = dates.map((date, i) => ({
  date,
  latest_market: {
    sections: {
      macro: {
        fear_greed: { value: i < 15 ? 72 : i < 30 ? 18 : 45 },
        treasury_10y: { value: 4.1 },
        sofr: { value: 3.7 },
      },
    },
  },
  sentiment: {
    indicators: {
      breadth: { average: i < 15 ? 68 : i < 30 ? 28 : 45 },
      vix: { value: i < 15 ? 15 : i < 30 ? 34 : 22 },
      pcr: { pcr_oi: i < 15 ? 0.8 : i < 30 ? 1.4 : 1.0 },
    },
  },
  health: {
    smh_igv: { trend: i < 15 ? "risk-on" : i < 30 ? "risk-off" : "neutral" },
    oil_premium: { level: i < 30 ? "normal" : "high" },
    gold_fair_value: { level: i < 30 ? "normal" : "high" },
  },
  beta: { equity_beta: i < 30 ? 1.35 : 1.1 },
  quant: { portfolioHealth: i < 15 ? 4.4 : i < 30 ? 2.6 : 3.4 },
  crypto_ts: {
    latest: { fgi: i < 15 ? 74 : i < 30 ? 18 : 42, composite: i < 15 ? 68 : i < 30 ? 30 : 45 },
    data: Array.from({ length: 30 }, (_, j) => ({ date: `2025-12-${String(j + 1).padStart(2, "0")}`, btc_close: 100 + j + i })),
  },
  crypto_state: {},
  gold_tracker: { signal: { status: i < 30 ? "green" : "yellow" } },
  gold_ts: { data: Array.from({ length: 30 }, (_, j) => ({ date: `2025-12-${String(j + 1).padStart(2, "0")}`, xau_usd: 3000 + j + i })) },
  private: { totalAssets: 100, assets: [{ id: "stablecoin", amount: 30 }] },
}));

fs.writeFileSync(fixture, JSON.stringify({ dates, returns, snapshots }, null, 2), "utf8");

execFileSync("python3", [script, "--fixture", fixture, "--output", out, "--report", report], {
  cwd: root,
  stdio: "pipe",
  encoding: "utf8",
});

const result = JSON.parse(fs.readFileSync(out, "utf8"));
assert.equal(result._meta.schema, "portfolio-allocation-backtest/v1");
assert.equal(result.data_coverage.days, dates.length);
assert.ok(result.strategies.static.metrics.final_value > 0);
assert.ok(result.strategies.dynamic.metrics.final_value > 0);
assert.ok(Number.isFinite(result.strategies.dynamic.metrics.max_drawdown_pct));
assert.ok(Number.isFinite(result.strategies.dynamic.metrics.sharpe));
assert.ok(result.strategies.dynamic.rebalance_events.length > 0);
assert.ok(result.strategies.dynamic.target_history.some((row) => row.weights.stocks < 25 && row.weights.crypto < 10), "dynamic target should de-risk during stress regime");
assert.match(result.decision.status, /^(controller_candidate|dashboard_only|insufficient_data)$/);
assert.ok(Array.isArray(result.decision.reasons));
assert.ok(fs.readFileSync(report, "utf8").includes("# Portfolio Allocation Model Backtest"));

fs.rmSync(fixture, { force: true });
fs.rmSync(out, { force: true });
fs.rmSync(report, { force: true });
console.log("✅ portfolio allocation backtest test passed");
