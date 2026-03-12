#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const booksPath = path.join(__dirname, "../src/data/books.json");
const mediaPath = path.join(__dirname, "../src/data/media.json");

function normalizeTitle(value = "") {
  return value.trim().replace(/[《》“”"'`]/g, "").replace(/\s+/g, " ").toLowerCase();
}

function detectTypeFromMessage(message) {
  if (/(电影|影片|movie)/i.test(message)) return "movie";
  if (/(剧|series|show|电视剧|美剧|英剧|韩剧)/i.test(message)) return "series";
  return null;
}

function parseStatus(message) {
  if (/看完了|读完了|看完|读完|finished/i.test(message)) return "done";
  if (/在看|在读|正在看|正在读|watching|reading/i.test(message)) return "doing";
  return "note";
}

function parseRating(message) {
  const score = message.match(/评分\s*([0-9](?:\.\d)?)/i) || message.match(/([0-9](?:\.\d)?)\s*分/i);
  return score ? score[1] : null;
}

function parseNote(message) {
  const matched = message.match(/笔记[:：]\s*(.+)$/);
  return matched ? matched[1].trim() : null;
}

function parseTitle(message) {
  const cleaned = message
    .replace(/看完了|读完了|在看|在读|正在看|正在读|评分\s*[0-9](?:\.\d)?|[0-9](?:\.\d)?\s*分|笔记[:：].*$/gi, "")
    .replace(/[，,。.!！]/g, " ")
    .trim();

  return cleaned.replace(/^(电影|剧|书)\s*/, "").trim();
}

function buildBookUpdate(entry, parsed) {
  const next = {
    title: parsed.title,
    author: "",
    status: "想读",
    type: "电子书",
    rating: null,
    tags: [],
    shelf: "",
    source: "discord-human",
    ...entry,
  };
  if (parsed.status === "done") next.status = "已读";
  if (parsed.status === "doing") next.status = "在读";
  if (parsed.rating) next.rating = `${parsed.rating}/10`;
  if (parsed.note) {
    next.notes = next.notes || {};
    next.notes.impact = parsed.note;
  }
  return next;
}

function buildMediaUpdate(entry, parsed) {
  const next = {
    title: parsed.title,
    titleEn: /^[A-Za-z0-9\s:,'&.-]+$/.test(parsed.title) ? parsed.title : "",
    type: parsed.hintedType || "series",
    status: "planned",
    tags: [],
    source: "discord-human",
    ...entry,
  };
  if (parsed.status === "done") next.status = "watched";
  if (parsed.status === "doing") next.status = "watching";
  if (parsed.note) {
    next.note = parsed.note;
  }
  if (parsed.rating) {
    next.rating = `${parsed.rating}/10`;
  }
  return next;
}

function parseMessage(message) {
  const title = parseTitle(message);
  if (!title) {
    throw new Error("无法从消息里解析标题");
  }

  return {
    raw: message,
    title,
    normalizedTitle: normalizeTitle(title),
    status: parseStatus(message),
    rating: parseRating(message),
    note: parseNote(message),
    hintedType: detectTypeFromMessage(message),
  };
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function saveJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const message = args.filter((arg) => !arg.startsWith("--")).join(" ").trim();

  if (!message) {
    console.error("Usage: node scripts/library-update-listener.mjs [--apply] \"看完了三体，评分 9\"");
    process.exit(1);
  }

  const parsed = parseMessage(message);
  const [books, media] = await Promise.all([loadJson(booksPath), loadJson(mediaPath)]);

  const bookIndex = books.findIndex((item) => normalizeTitle(item.title) === parsed.normalizedTitle);
  const mediaIndex = media.findIndex((item) => {
    return normalizeTitle(item.title) === parsed.normalizedTitle || normalizeTitle(item.titleEn || "") === parsed.normalizedTitle;
  });

  let target = null;
  let file = null;
  let before = null;
  let after = null;

  if (bookIndex >= 0 && (parsed.hintedType !== "movie" && parsed.hintedType !== "series")) {
    target = "book";
    file = "src/data/books.json";
    before = books[bookIndex];
    after = buildBookUpdate(before, parsed);
    if (apply) {
      books[bookIndex] = after;
      await saveJson(booksPath, books);
    }
  } else if (mediaIndex >= 0) {
    target = media[mediaIndex].type;
    file = "src/data/media.json";
    before = media[mediaIndex];
    after = buildMediaUpdate(before, parsed);
    if (apply) {
      media[mediaIndex] = after;
      await saveJson(mediaPath, media);
    }
  } else {
    const shouldCreateMedia = parsed.hintedType || (/[A-Za-z]/.test(parsed.title) && parsed.status === "doing");
    if (shouldCreateMedia) {
      target = parsed.hintedType || "series";
      file = "src/data/media.json";
      before = null;
      after = buildMediaUpdate({}, parsed);
      if (apply) {
        media.unshift(after);
        await saveJson(mediaPath, media);
      }
    } else {
      target = "book";
      file = "src/data/books.json";
      before = null;
      after = buildBookUpdate({}, parsed);
      if (apply) {
        books.unshift(after);
        await saveJson(booksPath, books);
      }
    }
  }

  console.log(JSON.stringify({ apply, target, file, parsed, before, after }, null, 2));
}

await main();
