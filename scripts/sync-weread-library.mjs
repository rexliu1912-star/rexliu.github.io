#!/usr/bin/env node
/**
 * Sync WeRead shelf + reading stats into rexliu.io library data.
 *
 * Public contract:
 * - Raw API snapshots are stored under src/data/weread/raw/ for traceability.
 * - Public summary stats are stored in src/data/weread/reading-stats.json.
 * - src/data/books.json is merged additively: hand-curated fields win, except WeRead covers are refreshed from WeRead.
 * - Public user-written thoughts/reviews are synced; raw highlights/bookmarks are not.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BOOKS_JSON = path.join(ROOT, "src/data/books.json");
const WEREAD_DIR = path.join(ROOT, "src/data/weread");
const RAW_DIR = path.join(WEREAD_DIR, "raw");
const PUBLIC_STATS_JSON = path.join(WEREAD_DIR, "reading-stats.json");
const API_URL = "https://i.weread.qq.com/api/agent/gateway";
const SKILL_VERSION = "1.0.3";

// Tencent WeRead gateway is reachable directly from the Mac mini, while the
// inherited Clash proxy can make Node/undici fail with a generic "fetch failed".
for (const proxyKey of [
	"HTTP_PROXY",
	"HTTPS_PROXY",
	"ALL_PROXY",
	"http_proxy",
	"https_proxy",
	"all_proxy",
]) {
	delete process.env[proxyKey];
}

const ENV_PATHS = [
	path.join(process.env.HOME || "", ".hermes/profiles/samantha/.env"),
	"/Users/samantha/.hermes/profiles/samantha/.env",
	"/Users/samantha/.hermes/.env",
];

function readEnvValue(name) {
	if (process.env[name]) return process.env[name];
	for (const envPath of ENV_PATHS) {
		if (!envPath || !existsSync(envPath)) continue;
		const text = readFileSync(envPath, "utf8");
		for (const rawLine of text.split(/\r?\n/)) {
			const line = rawLine.trim();
			if (!line || line.startsWith("#")) continue;
			const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
			if (!match || match[1] !== name) continue;
			return match[2].trim().replace(/^['"]|['"]$/g, "");
		}
	}
	return null;
}

function toDate(ts) {
	if (!ts) return "";
	return new Date(ts * 1000).toISOString().slice(0, 10);
}

function secondsToText(seconds) {
	const total = Math.max(0, Math.round(Number(seconds) || 0));
	const hours = Math.floor(total / 3600);
	const minutes = Math.round((total % 3600) / 60);
	if (hours <= 0) return `${minutes}分`;
	if (minutes <= 0) return `${hours}时`;
	return `${hours}时 ${minutes}分`;
}

function normalizeTitle(title = "") {
	return String(title)
		.replace(/[（(].*?[）)]/g, "")
		.replace(/[：:（(].*$/g, "")
		.replace(/\s+/g, "")
		.trim();
}

function categoryToTags(category = "") {
	const text = String(category);
	const tags = [];
	if (/投资|经济|金融|商业|管理/.test(text)) tags.push("投资");
	if (/成长|心理|励志|个人/.test(text)) tags.push("成长");
	if (/文学|小说|散文|诗歌/.test(text)) tags.push("文学");
	if (/历史|文化|哲学|艺术|传记/.test(text)) tags.push("文化");
	return [...new Set(tags)];
}

function categoryToShelf(category = "") {
	const text = String(category);
	if (/投资|经济|金融|商业|管理/.test(text)) return "商业江湖";
	if (/成长|心理|励志|个人/.test(text)) return "个人进化";
	if (/历史|文化|哲学|艺术|传记/.test(text)) return "古风传统";
	return "小说风云";
}

function buildStatsIndex(...statsList) {
	const byBookId = new Map();
	for (const stats of statsList) {
		for (const item of stats?.readLongest || []) {
			const book = item.book || item.albumInfo;
			const id = book?.bookId || book?.albumId;
			if (!id) continue;
			const prev = byBookId.get(String(id)) || { readTime: 0, tags: [] };
			byBookId.set(String(id), {
				readTime: Math.max(prev.readTime || 0, item.readTime || 0),
				tags: [...new Set([...(prev.tags || []), ...(item.tags || [])])],
			});
		}
	}
	return byBookId;
}

function publicStats(mode, data) {
	return {
		mode,
		baseTime: data.baseTime ?? (mode === "overall" ? 0 : undefined),
		readDays: data.readDays ?? 0,
		totalReadTimeSeconds: data.totalReadTime ?? 0,
		totalReadTimeText: secondsToText(data.totalReadTime ?? 0),
		dayAverageReadTimeSeconds: data.dayAverageReadTime ?? undefined,
		dayAverageReadTimeText: data.dayAverageReadTime
			? secondsToText(data.dayAverageReadTime)
			: undefined,
		compare: typeof data.compare === "number" ? data.compare : undefined,
		preferCategoryWord: data.preferCategoryWord,
		preferTimeWord: data.preferTimeWord,
		authorCount: data.authorCount,
		readStat: data.readStat || [],
		preferCategory: (data.preferCategory || [])
			.filter((item) => (item.readingTime || 0) > 0 || (item.readingCount || 0) > 0)
			.slice(0, 8)
			.map((item) => ({
				categoryTitle: item.categoryTitle,
				parentCategoryTitle: item.parentCategoryTitle,
				readingTimeSeconds: item.readingTime || 0,
				readingTimeText: secondsToText(item.readingTime || 0),
				readingCount: item.readingCount || 0,
			})),
		readLongest: (data.readLongest || []).slice(0, 8).map((item) => {
			const book = item.book || item.albumInfo || {};
			return {
				bookId: String(book.bookId || book.albumId || ""),
				title: book.title || book.name || "",
				author: book.author || book.authorName || "",
				cover: book.cover || "",
				readTimeSeconds: item.readTime || 0,
				readTimeText: secondsToText(item.readTime || 0),
				tags: item.tags || [],
			};
		}),
	};
}

export function publicProgress(data, chapters = []) {
	const book = data?.book || data || {};
	const percent = Math.max(0, Math.min(100, Math.round(Number(book.progress || 0))));
	const currentChapterUid = book.chapterUid ?? undefined;
	const chapter = chapters.find((item) => String(item.chapterUid) === String(currentChapterUid));
	const readingTimeSeconds = Math.max(0, Math.round(Number(book.recordReadingTime || 0)));
	return {
		percent,
		currentChapterUid,
		currentChapter: chapter?.title || book.chapterName || "",
		updatedAt: toDate(book.updateTime),
		readingTimeSeconds,
		readingTimeText: secondsToText(readingTimeSeconds),
		isStarted: Boolean(book.isStartReading || percent > 0 || readingTimeSeconds > 0),
		isFinished: percent === 100,
		...(book.finishTime ? { finishedAt: toDate(book.finishTime) } : {}),
	};
}

export function publicReviews(data) {
	return (data?.reviews || [])
		.map((item) => item.review?.review || item.review || item)
		.filter((review) => String(review?.content || "").trim().length > 0)
		.map((review) => ({
			id: String(review.reviewId || review.id || ""),
			content: String(review.content || "").trim(),
			...(review.chapterName ? { chapter: review.chapterName } : {}),
			...(review.createTime ? { createdAt: toDate(review.createTime) } : {}),
			...(Number(review.star) > 0 ? { rating: Number(review.star) } : {}),
		}));
}

async function fetchPublicBookTelemetry(book) {
	const bookId = String(book.bookId || "");
	if (!bookId || Number(book.secret || 0) === 1) return null;

	const safeCall = async (apiName, params, fallback) => {
		try {
			return await callWeRead(apiName, params);
		} catch (error) {
			console.warn(`⚠️  WeRead ${apiName} skipped for ${bookId}: ${error.message}`);
			return fallback;
		}
	};

	const progressRaw = await safeCall("/book/getprogress", { bookId }, null);
	if (!progressRaw) return null;
	const chaptersRaw = await safeCall("/book/chapterinfo", { bookId }, { chapters: [] });
	const reviewsRaw = await safeCall("/review/list/mine", { bookid: bookId }, { reviews: [] });

	return {
		bookId,
		progressRaw,
		chaptersRaw,
		reviewsRaw,
		progress: publicProgress(progressRaw, chaptersRaw.chapters || []),
		reviews: publicReviews(reviewsRaw),
	};
}

async function callWeRead(apiName, params = {}) {
	const key = readEnvValue("WEREAD_API_KEY");
	if (!key) throw new Error("Missing WEREAD_API_KEY in env or Hermes .env files");

	let lastError;
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const res = await fetch(API_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${key}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ api_name: apiName, skill_version: SKILL_VERSION, ...params }),
			});
			if (!res.ok) throw new Error(`${apiName} HTTP ${res.status}: ${await res.text()}`);
			const data = await res.json();
			if (data.upgrade_info)
				throw new Error(
					`WeRead skill upgrade required: ${data.upgrade_info.message || JSON.stringify(data.upgrade_info)}`,
				);
			if (data.errcode && data.errcode !== 0)
				throw new Error(
					`${apiName} errcode ${data.errcode}: ${data.errmsg || data.msg || JSON.stringify(data)}`,
				);
			return data;
		} catch (error) {
			lastError = error;
			if (attempt === 3) break;
			await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
		}
	}
	throw lastError;
}

export function mergeBooks(
	existingBooks,
	shelfBooks,
	statsByBookId,
	progressByBookId = new Map(),
	reviewsByBookId = new Map(),
) {
	const publicShelfIds = new Set(
		shelfBooks
			.filter((book) => Number(book.secret || 0) === 0)
			.map((book) => String(book.bookId || ""))
			.filter(Boolean),
	);
	let prunedStale = 0;
	const books = existingBooks.filter((book) => {
		const wereadId = book.weread?.bookId || book.bookId;
		const isAutoWereadEntry =
			book.source === "weread" && String(book.slug || "").startsWith("weread-");
		if (isAutoWereadEntry && wereadId && !publicShelfIds.has(String(wereadId))) {
			prunedStale++;
			return false;
		}
		return true;
	});

	const byWereadId = new Map();
	const byExactTitle = new Map();
	const byLooseTitle = new Map();

	books.forEach((book, index) => {
		if (book.weread?.bookId) byWereadId.set(String(book.weread.bookId), index);
		if (book.bookId) byWereadId.set(String(book.bookId), index);
		byExactTitle.set(String(book.title).trim(), index);
		byLooseTitle.set(normalizeTitle(book.title), index);
	});

	let added = 0;
	let updated = 0;
	let skippedPrivate = 0;

	for (const shelfBook of shelfBooks) {
		const bookId = String(shelfBook.bookId || "");
		if (!bookId) continue;
		if (Number(shelfBook.secret || 0) === 1) {
			skippedPrivate++;
			continue;
		}

		const exactTitle = String(shelfBook.title || "").trim();
		const looseTitle = normalizeTitle(exactTitle);
		const idx =
			byWereadId.get(bookId) ?? byExactTitle.get(exactTitle) ?? byLooseTitle.get(looseTitle);
		const readStats = statsByBookId.get(bookId);
		const progress = progressByBookId.get(bookId);
		const thoughts = reviewsByBookId.get(bookId) || [];
		const currentlyReading = Boolean(
			progress &&
				!progress?.isFinished &&
				Number(progress?.percent || 0) > 0 &&
				Number(progress?.percent || 0) < 100,
		);
		const wereadMeta = {
			bookId,
			category: shelfBook.category || "",
			finishReading: Number(shelfBook.finishReading || 0) === 1,
			lastReadDate: toDate(shelfBook.readUpdateTime),
			updateDate: toDate(shelfBook.updateTime),
			source: "weread",
			...(progress ? { progress, currentlyReading } : {}),
			...(thoughts.length > 0 ? { thoughts } : {}),
			...(readStats
				? {
						rankedReadTime: secondsToText(readStats.readTime),
						rankedReadTimeSeconds: readStats.readTime,
						badges: readStats.tags,
					}
				: {}),
		};

		if (idx !== undefined) {
			const prev = books[idx];
			books[idx] = {
				...prev,
				source: prev.source || "weread",
				type: prev.type || "电子书",
				cover: shelfBook.cover || prev.cover,
				endDate: prev.endDate || (shelfBook.finishReading ? toDate(shelfBook.readUpdateTime) : ""),
				addedDate: prev.addedDate || toDate(shelfBook.updateTime),
				status: prev.status || (shelfBook.finishReading ? "已读" : "在读"),
				tags: prev.tags?.length ? prev.tags : categoryToTags(shelfBook.category),
				shelf: prev.shelf || categoryToShelf(shelfBook.category),
				weread: { ...(prev.weread || {}), ...wereadMeta },
			};
			updated++;
		} else {
			const entry = {
				title: exactTitle,
				author: shelfBook.author || "",
				status: shelfBook.finishReading ? "已读" : "在读",
				type: "电子书",
				rating: null,
				pages: "",
				tags: categoryToTags(shelfBook.category),
				shelf: categoryToShelf(shelfBook.category),
				readingTime: readStats?.readTime ? secondsToText(readStats.readTime) : "",
				startDate: "",
				endDate: shelfBook.finishReading ? toDate(shelfBook.readUpdateTime) : "",
				addedDate: toDate(shelfBook.updateTime),
				source: "weread",
				slug: `weread-${bookId}`,
				cover: shelfBook.cover || "",
				weread: wereadMeta,
			};
			books.push(entry);
			byWereadId.set(bookId, books.length - 1);
			byExactTitle.set(exactTitle, books.length - 1);
			byLooseTitle.set(looseTitle, books.length - 1);
			added++;
		}
	}

	return { books, added, updated, skippedPrivate, prunedStale };
}

async function main() {
	mkdirSync(RAW_DIR, { recursive: true });
	const now = new Date();
	const stamp = now.toISOString().replace(/[:.]/g, "-");
	const currentYear = now.getFullYear();
	const annualBaseTime = Math.floor(
		new Date(`${currentYear}-01-15T00:00:00+08:00`).getTime() / 1000,
	);

	console.log("📚 Fetching WeRead shelf + stats...");
	const [shelf, annual, overall] = await Promise.all([
		callWeRead("/shelf/sync"),
		callWeRead("/readdata/detail", { mode: "annually", baseTime: annualBaseTime }),
		callWeRead("/readdata/detail", { mode: "overall" }),
	]);

	writeFileSync(path.join(RAW_DIR, `shelf-${stamp}.json`), JSON.stringify(shelf, null, 2));
	writeFileSync(
		path.join(RAW_DIR, `stats-annual-${currentYear}-${stamp}.json`),
		JSON.stringify(annual, null, 2),
	);
	writeFileSync(
		path.join(RAW_DIR, `stats-overall-${stamp}.json`),
		JSON.stringify(overall, null, 2),
	);
	writeFileSync(path.join(RAW_DIR, "shelf-latest.json"), JSON.stringify(shelf, null, 2));
	writeFileSync(path.join(RAW_DIR, "stats-annual-latest.json"), JSON.stringify(annual, null, 2));
	writeFileSync(path.join(RAW_DIR, "stats-overall-latest.json"), JSON.stringify(overall, null, 2));

	const publicStatsData = {
		source: "WeRead",
		skillVersion: SKILL_VERSION,
		updatedAt: now.toISOString(),
		shelf: {
			books: shelf.books?.length || 0,
			albums: shelf.albums?.length || 0,
			hasMp: Boolean(shelf.mp),
			totalVisibleItems:
				(shelf.books?.length || 0) + (shelf.albums?.length || 0) + (shelf.mp ? 1 : 0),
			publicBooks: (shelf.books || []).filter((book) => Number(book.secret || 0) === 0).length,
			privateItems:
				(shelf.books || []).filter((book) => Number(book.secret || 0) === 1).length +
				(shelf.albums || []).filter((album) => Number(album.albumInfoExtra?.secret || 0) === 1)
					.length +
				(shelf.mp ? 1 : 0),
		},
		annual: publicStats("annually", annual),
		overall: publicStats("overall", overall),
	};
	writeFileSync(PUBLIC_STATS_JSON, `${JSON.stringify(publicStatsData, null, 2)}\n`);

	console.log("📚 Fetching WeRead progress + thoughts...");
	const publicShelfBooks = (shelf.books || []).filter((book) => Number(book.secret || 0) === 0);
	const telemetryItems = [];
	for (const book of publicShelfBooks) {
		const item = await fetchPublicBookTelemetry(book);
		if (item) telemetryItems.push(item);
	}
	const progressByBookId = new Map(telemetryItems.map((item) => [item.bookId, item.progress]));
	const reviewsByBookId = new Map(telemetryItems.map((item) => [item.bookId, item.reviews]));
	writeFileSync(
		path.join(RAW_DIR, `telemetry-${stamp}.json`),
		JSON.stringify(telemetryItems, null, 2),
	);
	writeFileSync(
		path.join(RAW_DIR, "telemetry-latest.json"),
		JSON.stringify(telemetryItems, null, 2),
	);

	const existingBooks = JSON.parse(readFileSync(BOOKS_JSON, "utf8"));
	const statsByBookId = buildStatsIndex(annual, overall);
	const result = mergeBooks(
		existingBooks,
		shelf.books || [],
		statsByBookId,
		progressByBookId,
		reviewsByBookId,
	);
	writeFileSync(BOOKS_JSON, `${JSON.stringify(result.books, null, 2)}\n`);

	console.log("✅ WeRead sync complete");
	console.log(
		`   Shelf: ${publicStatsData.shelf.totalVisibleItems} visible items (${publicStatsData.shelf.books} books + ${publicStatsData.shelf.albums} albums + ${publicStatsData.shelf.hasMp ? 1 : 0} mp)`,
	);
	console.log(
		`   books.json: +${result.added} added, ${result.updated} updated, ${result.skippedPrivate} private skipped, ${result.prunedStale} stale pruned`,
	);
	console.log(
		`   Annual: ${publicStatsData.annual.totalReadTimeText} · ${publicStatsData.annual.readDays} days`,
	);
	console.log(
		`   Overall: ${publicStatsData.overall.totalReadTimeText} · ${publicStatsData.overall.readDays} days`,
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error("❌ WeRead sync failed:", error.message);
		process.exit(1);
	});
}
