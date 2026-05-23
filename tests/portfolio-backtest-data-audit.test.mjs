import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const script = path.join(root, "scripts", "portfolio-backtest-data-audit.py");
const out = path.join(os.tmpdir(), `portfolio-backtest-data-audit-${process.pid}.json`);

assert.ok(fs.existsSync(script), "portfolio backtest data audit script must exist");

execFileSync("python3", [script, "--output", out], { cwd: root, stdio: "pipe" });
assert.ok(fs.existsSync(out), "audit script must write JSON output");

const audit = JSON.parse(fs.readFileSync(out, "utf8"));
assert.ok(audit.generated_at, "audit includes generated_at timestamp");
assert.ok(audit.sources && typeof audit.sources === "object", "audit includes sources object");
assert.ok(audit.coverage && typeof audit.coverage === "object", "audit includes coverage object");
assert.ok(["investment_grade", "short_sanity_replay", "insufficient"].includes(audit.verdict), "audit verdict is recognized");
assert.ok(Array.isArray(audit.required_for_backtest), "audit lists required backtest inputs");

for (const key of ["market_snapshots", "crypto_timeseries", "gold_timeseries"]) {
  assert.ok(audit.sources[key], `audit includes ${key}`);
  assert.ok(typeof audit.sources[key].observations === "number", `${key} has observation count`);
}

fs.rmSync(out, { force: true });
console.log("✅ portfolio backtest data audit test passed");
