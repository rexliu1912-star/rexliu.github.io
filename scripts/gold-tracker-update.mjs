#!/usr/bin/env node
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const clawdRoot = resolve(repoRoot, "..", "..");
const fetcher = resolve(clawdRoot, "scripts", "gold-data-fetcher.py");

console.log("🥇 Updating Gold Tracker data...");
if (!existsSync(fetcher)) {
	console.error(`Missing fetcher: ${fetcher}`);
	process.exit(1);
}

const result = spawnSync("python3", [fetcher], {
	cwd: clawdRoot,
	stdio: "inherit",
	env: process.env,
});

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}

const files = ["gold-tracker.json", "gold-timeseries.json"];
for (const file of files) {
	const src = resolve(clawdRoot, "data", file);
	const dest = resolve(repoRoot, "src", "data", file);
	if (!existsSync(src)) {
		console.error(`Missing generated data: ${src}`);
		process.exit(1);
	}
	copyFileSync(src, dest);
	console.log(`✅ Copied ${file} → src/data/${file}`);
}

console.log("✅ Gold Tracker website data refreshed");
