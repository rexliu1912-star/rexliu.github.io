#!/usr/bin/env node
/**
 * portfolio-privacy-check.mjs
 *
 * Privacy audit for src/data/portfolio-public.json.
 * Scans for forbidden keys and suspicious absolute-amount patterns.
 * Exits non-zero if violations found — blocks build.
 *
 * Run by prebuild hook after build-portfolio-public.mjs.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const TARGET = path.join(ROOT, "src/data/portfolio-public.json");

// Absolute prohibitions — these should NEVER appear in public JSON
const FORBIDDEN_KEYS = [
  "quantity", "avgCost", "totalCost", "targetAmount",
  "marketValue", "unrealizedPnl", "costBasis", "realizedPnl",
  "lastPrice", // individual prices leak position size when combined with other public data
  "source_values", // per-exchange balance breakdown
  "sources", // exchange name list (reveals distribution)
];

// Suspicious patterns (regex) — absolute currency amounts
const SUSPICIOUS_PATTERNS = [
  { pattern: /¥\s*[\d,]{4,}/, note: "CNY amount ≥¥1000" },
  { pattern: /\$\s*[\d,]{5,}/, note: "USD amount ≥$10,000" },
  { pattern: /HK\$\s*[\d,]{4,}/, note: "HKD amount" },
  { pattern: /CNY\s*[\d,]{4,}/, note: "CNY amount" },
];

async function main() {
  const buf = await fs.readFile(TARGET, "utf8");
  const raw = buf;

  const violations = [];

  // 1. Forbidden key name check — look for "keyName":
  for (const key of FORBIDDEN_KEYS) {
    const re = new RegExp(`"${key}"\\s*:`, "g");
    const matches = raw.match(re) || [];
    if (matches.length > 0) {
      violations.push({
        type: "forbidden_key",
        key,
        count: matches.length,
      });
    }
  }

  // 2. Suspicious absolute amount patterns
  for (const { pattern, note } of SUSPICIOUS_PATTERNS) {
    const matches = raw.match(new RegExp(pattern, "g")) || [];
    if (matches.length > 0) {
      // Dedupe and show first few
      const unique = [...new Set(matches)].slice(0, 5);
      violations.push({
        type: "suspicious_amount",
        pattern: pattern.toString(),
        note,
        samples: unique,
        count: matches.length,
      });
    }
  }

  if (violations.length > 0) {
    console.error("❌ Portfolio privacy check FAILED:\n");
    for (const v of violations) {
      if (v.type === "forbidden_key") {
        console.error(`  ✗ Forbidden key "${v.key}" appears ${v.count}× in ${path.basename(TARGET)}`);
      } else {
        console.error(`  ✗ ${v.note}: ${v.count} match(es), e.g. ${v.samples.join(", ")}`);
      }
    }
    console.error("\n  Fix build-portfolio-public.mjs to strip these before shipping.");
    process.exit(1);
  }

  console.log(`✅ Privacy check passed (${path.basename(TARGET)})`);
}

main().catch((err) => {
  console.error("❌ Privacy check crashed:", err);
  process.exit(1);
});
