import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const booksPath = path.join(__dirname, "../src/data/books.json");
const GOOGLE_API = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_COVER = "https://covers.openlibrary.org/b";
const PROXY = "http://127.0.0.1:7890";

process.env.HTTP_PROXY ??= PROXY;
process.env.HTTPS_PROXY ??= PROXY;
process.env.ALL_PROXY ??= PROXY;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanTitle(value = "") {
  return value
    .replace(/[（(【\[].*?[）)】\]]/g, "")
    .replace(/[：:｜|].*$/g, "")
    .replace(/（全集）|\(全集\)|（全.册）|\(全.册\)/g, "")
    .trim();
}

function cleanAuthor(value = "") {
  return value
    .split(/[,，/]/)[0]
    .replace(/[\[【〔(（].*?[\]】〕)）]/g, "")
    .replace(/著|编著|译|果麦文化/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCover(url) {
  if (!url) return null;
  return url
    .replace(/^http:/, "https:")
    .replace(/&zoom=\d+/g, "")
    .replace(/&edge=curl/g, "")
    .trim();
}

async function fetchJson(url, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "rexliu-website-library-cover-fetcher/1.0",
          accept: "application/json",
        },
      });

      if (response.status === 429) {
        const error = new Error(`429 ${url}`);
        error.code = 429;
        throw error;
      }

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

async function fetchGoogleCover(title, author) {
  const q = [
    `intitle:${cleanTitle(title)}`,
    cleanAuthor(author) ? `inauthor:${cleanAuthor(author)}` : null,
  ]
    .filter(Boolean)
    .join("+");

  const url = `${GOOGLE_API}?q=${encodeURIComponent(q)}&maxResults=3&printType=books&fields=items(volumeInfo(title,authors,imageLinks,industryIdentifiers))`;
  const data = await fetchJson(url, 1);
  const items = Array.isArray(data.items) ? data.items : [];

  for (const item of items) {
    const imageLinks = item?.volumeInfo?.imageLinks;
    const cover = normalizeCover(
      imageLinks?.extraLarge || imageLinks?.large || imageLinks?.medium || imageLinks?.thumbnail || imageLinks?.smallThumbnail,
    );
    if (cover) return cover;
  }

  return null;
}

async function fetchOpenLibraryCover(title, author) {
  const params = new URLSearchParams({
    title: cleanTitle(title),
    limit: "5",
    fields: "title,author_name,cover_i,isbn",
  });
  if (cleanAuthor(author)) params.set("author", cleanAuthor(author));

  const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`;
  const data = await fetchJson(url, 1);
  const docs = Array.isArray(data.docs) ? data.docs : [];

  for (const doc of docs) {
    if (doc.cover_i) {
      return `${OPEN_LIBRARY_COVER}/id/${doc.cover_i}-L.jpg`;
    }
    if (Array.isArray(doc.isbn) && doc.isbn[0]) {
      return `${OPEN_LIBRARY_COVER}/isbn/${doc.isbn[0]}-L.jpg`;
    }
  }

  return null;
}

async function main() {
  const books = JSON.parse(await readFile(booksPath, "utf8"));

  let covered = 0;
  let googleHits = 0;
  let openLibraryHits = 0;
  let misses = 0;
  let quotaExceeded = false;

  for (const book of books) {
    let cover = book.cover || null;

    if (!cover) {
      try {
        cover = await fetchGoogleCover(book.title, book.author);
        if (cover) {
          googleHits += 1;
        }
      } catch (error) {
        if (String(error?.message || "").includes("429")) {
          quotaExceeded = true;
        }
      }
    }

    if (!cover) {
      try {
        cover = await fetchOpenLibraryCover(book.title, book.author);
        if (cover) {
          openLibraryHits += 1;
        }
      } catch {
        // ignore fallback failures per entry
      }
    }

    if (cover) {
      book.cover = cover;
      covered += 1;
      console.log(`✓ ${book.title}`);
    } else {
      if ("cover" in book) delete book.cover;
      misses += 1;
      console.log(`- ${book.title}`);
    }

    await sleep(250);
  }

  await writeFile(booksPath, `${JSON.stringify(books, null, 2)}\n`, "utf8");

  console.log(`\nCovered: ${covered}/${books.length}`);
  console.log(`Google hits: ${googleHits}`);
  console.log(`Open Library fallback hits: ${openLibraryHits}`);
  console.log(`Misses: ${misses}`);
  if (quotaExceeded) {
    console.log("Note: Google Books API returned 429 quota errors during this run, so Open Library fallback was used where needed.");
  }
}

await main();
