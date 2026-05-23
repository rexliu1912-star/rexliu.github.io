import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const script = path.join(root, "scripts", "portfolio-allocation-model.py");
const out = path.join(os.tmpdir(), `portfolio-model-${process.pid}.json`);

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
