import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { callWeRead, SKILL_VERSION } from "../scripts/sync-weread-library.mjs";

test("gateway version matches reviewed official installed skill", () => {
	const file = path.join(os.homedir(), ".hermes/skills/weread-skills/SKILL.md");
	if (existsSync(file))
		assert.equal(SKILL_VERSION, readFileSync(file, "utf8").match(/^version:\s*(\S+)/m)[1]);
	assert.equal(SKILL_VERSION, "1.0.5");
});

test("requests stay flat and report version 1.0.5", async () => {
	const previous = globalThis.fetch;
	const oldKey = process.env.WEREAD_API_KEY;
	process.env.WEREAD_API_KEY = "unit-test-not-a-real-credential";
	try {
		globalThis.fetch = async (_url, request) => {
			assert.deepEqual(JSON.parse(request.body), {
				api_name: "/shelf/sync",
				skill_version: "1.0.5",
				count: 10,
			});
			return { ok: true, json: async () => ({ books: [] }) };
		};
		assert.deepEqual(await callWeRead("/shelf/sync", { count: 10 }), { books: [] });
	} finally {
		globalThis.fetch = previous;
		if (oldKey === undefined) delete process.env.WEREAD_API_KEY;
		else process.env.WEREAD_API_KEY = oldKey;
	}
});

test("upgrade response is explicit, non-retried, includes reviewed URL/version", async () => {
	const previous = globalThis.fetch;
	const oldKey = process.env.WEREAD_API_KEY;
	process.env.WEREAD_API_KEY = "unit-test-not-a-real-credential";
	let calls = 0;
	try {
		globalThis.fetch = async () => {
			calls++;
			return {
				ok: true,
				json: async () => ({
					upgrade_info: {
						latest_version: "fixture-only",
						message: "update required",
						upgrade_url: "https://cdn.weread.qq.com/skills/weread-skills.zip",
					},
				}),
			};
		};
		await assert.rejects(
			callWeRead("/shelf/sync"),
			/upgrade required.*fixture-only.*https:\/\/cdn\.weread\.qq\.com/,
		);
		assert.equal(calls, 1);
	} finally {
		globalThis.fetch = previous;
		if (oldKey === undefined) delete process.env.WEREAD_API_KEY;
		else process.env.WEREAD_API_KEY = oldKey;
	}
});
