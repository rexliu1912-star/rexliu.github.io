import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mergeBooks, publicProgress, publicReviews } from "../scripts/sync-weread-library.mjs";

test("publicProgress keeps 0-100 percent semantics and resolves current chapter", () => {
	const progress = publicProgress(
		{
			book: {
				bookId: "b1",
				chapterUid: 102,
				progress: 37,
				updateTime: 1767225600,
				recordReadingTime: 3661,
				isStartReading: 1,
			},
			timestamp: 1767225605,
		},
		[
			{ chapterUid: 101, title: "Intro" },
			{ chapterUid: 102, title: "Chapter 2: The Turn" },
		],
	);

	assert.deepEqual(progress, {
		percent: 37,
		currentChapterUid: 102,
		currentChapter: "Chapter 2: The Turn",
		updatedAt: "2026-01-01",
		readingTimeSeconds: 3661,
		readingTimeText: "1时 1分",
		isStarted: true,
		isFinished: false,
	});
});

test("publicReviews publishes only Rex's own thoughts, not bookmark/highlight text", () => {
	const reviews = publicReviews({
		reviews: [
			{
				review: {
					reviewId: "r1",
					content: "This is the actual thought.",
					abstract: "highlight text must not be published",
					markText: "bookmark text must not be published",
					chapterName: "Chapter 1",
					createTime: 1767225600,
					star: -1,
				},
			},
			{ review: { reviewId: "empty", content: "   " } },
		],
	});

	assert.deepEqual(reviews, [
		{
			id: "r1",
			content: "This is the actual thought.",
			chapter: "Chapter 1",
			createdAt: "2026-01-01",
		},
	]);
	assert.equal(JSON.stringify(reviews).includes("highlight text"), false);
	assert.equal(JSON.stringify(reviews).includes("bookmark text"), false);
});

test("mergeBooks attaches progress and thoughts and marks active unfinished books as currently reading", () => {
	const result = mergeBooks(
		[],
		[
			{
				bookId: "b1",
				title: "Live Book",
				author: "Rex",
				category: "经济理财-财经",
				cover: "cover.jpg",
				secret: 0,
				finishReading: 0,
				readUpdateTime: 1767225600,
				updateTime: 1767225600,
			},
		],
		new Map(),
		new Map([["b1", { percent: 42, currentChapter: "Chapter 4", readingTimeText: "2时" }]]),
		new Map([["b1", [{ id: "r1", content: "A thought" }]]]),
	);

	assert.equal(result.books[0].status, "在读");
	assert.equal(result.books[0].weread.currentlyReading, true);
	assert.equal(result.books[0].weread.progress.percent, 42);
	assert.equal(result.books[0].weread.thoughts[0].content, "A thought");
});

test("Library source no longer contains the Read it too interaction", () => {
	const page = readFileSync("src/pages/os/library/index.astro", "utf8");
	const masonry = readFileSync("src/components/library/LibraryMasonry.tsx", "utf8");
	const source = `${page}\n${masonry}`.toLowerCase();

	for (const forbidden of ["read it too", "lib-react", "reaction", "shiny-butterfly"]) {
		assert.equal(source.includes(forbidden), false, `${forbidden} should be removed`);
	}
});
