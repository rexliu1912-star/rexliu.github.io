import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const overrides = JSON.parse(
	readFileSync(new URL("../src/data/portfolio-overrides.json", import.meta.url), "utf8"),
);
const published = JSON.parse(
	readFileSync(new URL("../src/data/portfolio-public.json", import.meta.url), "utf8"),
);

const publishedByTicker = new Map(
	(published.clearances ?? []).map((clearance) => [clearance.ticker, clearance]),
);

const editorialFields = [
	"name_en",
	"name_zh",
	"sector_tags_en",
	"sector_tags_zh",
	"reason_en",
	"reason_zh",
	"lesson_en",
	"lesson_zh",
	"article_url",
];

test("editorial clearance narrative overrides auto-generated narrative", () => {
	for (const editorial of overrides.clearances ?? []) {
		const output = publishedByTicker.get(editorial.ticker);
		assert.ok(output, `missing published clearance for ${editorial.ticker}`);
		for (const field of editorialFields) {
			assert.deepEqual(
				output[field],
				editorial[field],
				`${editorial.ticker}.${field} must preserve the editorial override`,
			);
		}
	}
});

test("300308 public clearance omits private execution identifiers and quantity", () => {
	const clearance = publishedByTicker.get("300308");
	const editorial = (overrides.clearances ?? []).find((item) => item.ticker === "300308");
	assert.ok(clearance, "missing 300308 clearance");
	assert.ok(editorial, "missing 300308 editorial clearance");
	assert.deepEqual(clearance.trade_points, editorial.trade_points);
	const text = JSON.stringify(clearance);
	assert.doesNotMatch(text, /1580487934|1580504508|合同号|100股/);
});
