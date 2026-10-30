#!/usr/bin/env node
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";

const scriptPath = process.env.EARNINGS_CUSTOM_STOCKS_SYNC_SCRIPT;

if (!scriptPath) {
	console.log("postbuild: EARNINGS_CUSTOM_STOCKS_SYNC_SCRIPT not set; skipping custom stocks sync");
	process.exit(0);
}

try {
	await access(scriptPath, constants.R_OK);
} catch {
	console.log(`postbuild: custom stocks sync script not found/readable; skipping (${scriptPath})`);
	process.exit(0);
}

const child = spawn("python3", [scriptPath], {
	stdio: "inherit",
	env: process.env,
});

child.on("exit", (code, signal) => {
	if (signal) {
		console.error(`postbuild: custom stocks sync terminated by ${signal}`);
		process.exit(1);
	}
	process.exit(code ?? 1);
});

child.on("error", (error) => {
	console.error(`postbuild: failed to run custom stocks sync: ${error.message}`);
	process.exit(1);
});
