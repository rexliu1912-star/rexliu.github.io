import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const media = JSON.parse(readFileSync(new URL("../src/data/media.json", import.meta.url), "utf8"));
const reflection = [
	"难得一见的精品电视剧。",
	"人生对照、时代变迁、生活百态全都历历在目。",
	"演技最好的当属花姨、红兵与几位小演员了。",
	"每个人都要做好人生的主角。",
	"很感谢编剧从婚后继续讲述生活的酸甜苦辣，纸上得来终觉浅，绝知此事要躬行。",
].join("\n\n");

test("The Lead has one series entry preserving Rex's complete original reflection", () => {
	const entries = media.filter((item) => item.slug === "the-lead-2026" || item.title === "主角");
	assert.equal(entries.length, 1);
	const entry = entries[0];
	assert.equal(entry.type, "series");
	assert.equal(entry.year, 2026);
	assert.equal(entry.status, "watched");
	assert.equal(entry.notes.impact, reflection);
	assert.ok(existsSync(new URL(`../public${entry.cover}`, import.meta.url)));
});

test("series details render impact notes instead of silently discarding them", () => {
	const source = readFileSync(new URL("../src/pages/library/index.astro", import.meta.url), "utf8");
	const series = source.split('id="series-grid-view"')[1].split("end series-grid-view")[0];
	assert.ok(series.includes("item.notes?.impact"));
	assert.ok(series.includes("item.notes.impact.split"));
});
