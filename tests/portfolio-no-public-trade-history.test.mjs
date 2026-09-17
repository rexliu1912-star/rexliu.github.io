import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");
const buildScript = read("../scripts/build-portfolio-public.mjs");
const page = read("../src/pages/portfolio.astro");
const overrides = JSON.parse(read("../src/data/portfolio-overrides.json"));
const published = JSON.parse(read("../src/data/portfolio-public.json"));

test("public portfolio pipeline does not fetch or publish private trade history", () => {
	assert.doesNotMatch(buildScript, /portfolio:listTrades|buildAutoClearances|mergeClearances/);
	assert.equal(Object.hasOwn(overrides, "clearances"), false);
	assert.equal(Object.hasOwn(published, "clearances"), false);
});

test("portfolio page has no clearance replay surface or client chart hooks", () => {
	assert.doesNotMatch(page, /clearance-section|clearance-chart|Trade Replays|Last Clearance|data\.clearances/);
});
