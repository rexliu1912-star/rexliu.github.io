import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const script = path.join(root, "scripts", "portfolio-allocation-model.py");
const out = path.join(os.tmpdir(), `portfolio-model-${process.pid}.json`);
const fixture = path.join(os.tmpdir(), `portfolio-model-fixture-${process.pid}.json`);
const fixtureOut = path.join(os.tmpdir(), `portfolio-model-fixture-out-${process.pid}.json`);

fs.writeFileSync(fixture, JSON.stringify({
  latest_market: {
    sections: {
      macro: {
        fear_greed: { value: 20 },
        treasury_10y: { value: 4.2 },
        sofr: { value: 3.6 }
      }
    }
  },
  sentiment: {
    indicators: {
      breadth: { average: 35 },
      vix: { value: 31 },
      pcr: { pcr_oi: 1.35 }
    }
  },
  health: {
    smh_igv: { trend: "risk-off" },
    oil_premium: { level: "high" },
    gold_fair_value: { level: "normal" }
  },
  beta: { equity_beta: 1.4 },
  quant: { portfolioHealth: 3.2 },
  crypto_ts: {
    latest: { fgi: 20, composite: 35 },
    data: Array.from({ length: 30 }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, btc_close: 100 + i }))
  },
  crypto_state: {},
  gold_tracker: { signal: { status: "yellow" } },
  gold_ts: { data: Array.from({ length: 30 }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, xau_usd: 3000 + i })) },
  private: {
    totalAssets: 100,
    assets: [{ id: "stablecoin", amount: 30, apr: 5.1 }]
  }
}), "utf8");

execFileSync("python3", [script, "--snapshot-fixture", fixture, "--output", fixtureOut, "--no-smooth"], {
  cwd: root,
  stdio: "pipe",
  encoding: "utf8",
});
const fixtureModel = JSON.parse(fs.readFileSync(fixtureOut, "utf8"));
assert.equal(fixtureModel._meta.schema, "portfolio-allocation-model/v1");
assert.equal(fixtureModel._meta.source, "snapshot-fixture");
assert.equal(fixtureModel.categories.length, 5);
const fixtureSum = fixtureModel.categories.reduce((acc, c) => acc + c.target_pct, 0);
assert.ok(Math.abs(fixtureSum - 100) <= 0.2, `fixture targets must sum to 100, got ${fixtureSum}`);
const fixtureById = Object.fromEntries(fixtureModel.categories.map((c) => [c.id, c]));
assert.ok(fixtureById.stocks.target_pct < 25, "stress fixture should reduce stocks below base target");
assert.ok(fixtureById.crypto.target_pct < 10, "stress fixture should reduce crypto below base target");
assert.ok(fixtureById.stablecoin.target_pct > 30, "stress fixture should raise liquidity above base target");

execFileSync("python3", [script, "--output", out, "--no-smooth"], {
  cwd: root,
  stdio: "pipe",
  encoding: "utf8",
});

const model = JSON.parse(fs.readFileSync(out, "utf8"));

assert.equal(model._meta.schema, "portfolio-allocation-model/v1");
assert.equal(model.categories.length, 5);
assert.ok(["risk_on", "neutral", "defensive", "liquidity_stress"].includes(model.regime.name));
assert.ok(model.risk_free_rate_pct >= 0 && model.risk_free_rate_pct <= 8);

const ids = model.categories.map((c) => c.id).sort();
assert.deepEqual(ids, ["crypto", "funds", "gold", "stablecoin", "stocks"]);

const sum = model.categories.reduce((acc, c) => acc + c.target_pct, 0);
assert.ok(Math.abs(sum - 100) <= 0.2, `target weights must sum to 100, got ${sum}`);

const byId = Object.fromEntries(model.categories.map((c) => [c.id, c]));
assert.ok(byId.stablecoin.target_pct >= 20, "stablecoin floor protects liquidity");
assert.ok(byId.crypto.target_pct <= 15, "crypto cap prevents runaway risk");
assert.ok(byId.gold.target_pct >= 2 && byId.gold.target_pct <= 10, "gold hedge bounds");

for (const category of model.categories) {
  assert.ok(category.signal_score >= 0 && category.signal_score <= 100, `${category.id} signal score bounded`);
  assert.ok(category.expected_return_pct >= 0 && category.expected_return_pct <= 25, `${category.id} expected return sane`);
  assert.ok(category.annual_volatility_pct >= 0 && category.annual_volatility_pct <= 90, `${category.id} volatility sane`);
  assert.ok(category.rationale_en, `${category.id} rationale_en required`);
  assert.ok(category.rationale_zh, `${category.id} rationale_zh required`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
assert.equal(packageJson.scripts["model:portfolio"], "python3 scripts/portfolio-allocation-model.py");
assert.ok(packageJson.scripts.prebuild.startsWith("pnpm model:portfolio &&"), "prebuild must generate model before public JSON");

const publicBuildScript = fs.readFileSync(path.join(root, "scripts", "build-portfolio-public.mjs"), "utf8");
assert.ok(publicBuildScript.includes("portfolio-model-targets.json"), "public build reads generated model output");
assert.ok(publicBuildScript.includes("applyAllocationModel"), "public build applies model targets to allocation config");

fs.unlinkSync(out);
fs.rmSync(fixture, { force: true });
fs.rmSync(fixtureOut, { force: true });
console.log("✅ portfolio allocation model test passed");
