/**
 * fetch-covers-weread.mjs
 * 用微信读书 API 搜索书籍封面，替换低质量本地封面
 * Usage: node scripts/fetch-covers-weread.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { statSync, existsSync } from 'fs';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BOOKS_JSON = path.join(ROOT, 'src/data/books.json');
const COVERS_DIR = path.join(ROOT, 'public/covers/books');

// 低于此大小（字节）视为低质量，需要替换
const MIN_QUALITY_BYTES = 50 * 1024; // 50KB — 低于此重新抓高清

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function upgradeWeReadCoverUrl(url) {
  if (!url) return url;
  // s_BOOKID.jpg → t7_BOOKID.jpg (高清版，两个 CDN 均支持)
  return url.replace(/\/s_([^/]+\.jpg)$/, '/t7_$1');
}

async function searchWeRead(title, author) {
  const keyword = author ? `${title} ${author}` : title;
  const url = `https://weread.qq.com/web/search/global?keyword=${encodeURIComponent(keyword)}&type=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://weread.qq.com/',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const books = data?.books;
    if (!books || books.length === 0) return null;
    // 找最匹配的（优先标题完全一致）
    const exact = books.find(b => b.bookInfo?.title === title);
    const best = exact || books[0];
    const rawUrl = best?.bookInfo?.cover || null;
    return upgradeWeReadCoverUrl(rawUrl);
  } catch (e) {
    return null;
  }
}

async function downloadImage(url, destPath) {
  // Try with Referer first (WeRead hotlink protection), then without
  const attempts = [
    { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Referer': 'https://weread.qq.com/' },
    { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  ];
  for (const headers of attempts) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const writer = createWriteStream(destPath);
      await pipeline(res.body, writer);
      return true;
    } catch {}
  }
  return false;
}

function needsReplacement(localPath) {
  const abs = path.join(ROOT, 'public', localPath);
  if (!existsSync(abs)) return true;
  const size = statSync(abs).size;
  return size < MIN_QUALITY_BYTES;
}

async function main() {
  const books = JSON.parse(readFileSync(BOOKS_JSON, 'utf-8'));
  mkdirSync(COVERS_DIR, { recursive: true });

  let updated = 0, skipped = 0, failed = 0;

  for (const book of books) {
    const localPath = book.cover; // e.g. /covers/books/yuan-ze.jpg
    if (!localPath || !localPath.startsWith('/covers/books/')) {
      skipped++;
      continue;
    }

    if (!needsReplacement(localPath)) {
      console.log(`✅ 跳过（质量OK）: ${book.title}`);
      skipped++;
      continue;
    }

    console.log(`🔍 搜索: ${book.title}${book.author ? ' / ' + book.author : ''}`);
    const coverUrl = await searchWeRead(book.title, book.author);

    if (!coverUrl) {
      console.log(`  ❌ 未找到`);
      failed++;
      await sleep(500);
      continue;
    }

    const destPath = path.join(ROOT, 'public', localPath);
    const ok = await downloadImage(coverUrl, destPath);
    if (ok) {
      const size = statSync(destPath).size;
      console.log(`  ✅ 下载成功 (${Math.round(size/1024)}KB): ${coverUrl.slice(0, 60)}...`);
      updated++;
    } else {
      console.log(`  ❌ 下载失败: ${coverUrl}`);
      failed++;
    }

    await sleep(400); // 防止被限速
  }

  console.log(`\n完成: 更新 ${updated} | 跳过 ${skipped} | 失败 ${failed}`);
}

main().catch(console.error);
