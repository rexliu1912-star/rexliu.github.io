#!/usr/bin/env python3
from __future__ import annotations

import io
import json
import os
import re
import time
import unicodedata
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import quote_plus

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pypinyin import lazy_pinyin

ROOT = Path(__file__).resolve().parent.parent
BOOKS_PATH = ROOT / 'src/data/books.json'
COVERS_DIR = ROOT / 'public/covers/books'
GOOGLE_API = 'https://www.googleapis.com/books/v1/volumes'
OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'
OPEN_LIBRARY_COVER = 'https://covers.openlibrary.org/b/id/{cover_id}-L.jpg'
DOUBAN_SEARCH = 'https://book.douban.com/subject_search'
PROXY = 'http://127.0.0.1:7890'
REQUEST_DELAY = 0.5
MAX_BYTES = 50 * 1024
TARGET_SIZE = (300, 450)
USER_AGENT = 'rexliu-website-library-cover-fetcher/phase1'
NEEDS_MANUAL = 'needs_manual'

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': USER_AGENT, 'Accept': 'application/json,image/*,*/*;q=0.8'})
for key in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY'):
    os.environ.setdefault(key, PROXY)
SESSION.proxies.update({'http': os.environ.get('HTTP_PROXY', PROXY), 'https': os.environ.get('HTTPS_PROXY', PROXY)})


def sleep() -> None:
    time.sleep(REQUEST_DELAY)


def load_books() -> list[dict[str, Any]]:
    return json.loads(BOOKS_PATH.read_text(encoding='utf-8'))


def save_books(books: list[dict[str, Any]]) -> None:
    BOOKS_PATH.write_text(json.dumps(books, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def clean_title(title: str) -> str:
    text = (title or '').strip()
    text = re.sub(r'[（(【\[].*?[）)】\]]', '', text)
    text = re.sub(r'[：:｜|].*$', '', text)
    text = re.sub(r'(精选集|全集|全[册卷套])$', '', text).strip()
    return text or (title or '').strip()


def clean_author(author: str | None) -> str:
    text = (author or '').strip()
    if not text or text.lower() in {'unknown', 'unknown author'}:
        return ''
    text = re.sub(r'[\[【〔(（].*?[\]】〕)）]', ' ', text)
    text = re.sub(r'(著|编著|译|果麦文化)', ' ', text)
    text = re.split(r'[,，/、;；]', text)[0]
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def ascii_slug(text: str) -> str:
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^a-zA-Z0-9]+', '-', text.lower()).strip('-')
    return text


def slugify(title: str, used: set[str]) -> str:
    base = clean_title(title)
    ascii_version = ascii_slug(base)
    if not ascii_version:
        ascii_version = ascii_slug(' '.join(lazy_pinyin(base)))
    ascii_version = ascii_version[:40].strip('-') or 'book'
    slug = ascii_version
    index = 2
    while slug in used:
        suffix = f'-{index}'
        slug = (ascii_version[: max(1, 40 - len(suffix))].rstrip('-') + suffix).strip('-')
        index += 1
    used.add(slug)
    return slug


def normalize_google_cover(url: str | None) -> str | None:
    if not url:
        return None
    url = url.replace('http://', 'https://')
    url = re.sub(r'&zoom=\d+', '', url)
    return url


def fetch_json(url: str, params: dict[str, str] | None = None) -> dict[str, Any]:
    response = SESSION.get(url, params=params, timeout=25)
    response.raise_for_status()
    sleep()
    return response.json()


def score_candidate(book: dict[str, Any], title: str, authors: Iterable[str]) -> int:
    wanted_title = clean_title(book.get('title', '')).lower()
    title = (title or '').lower()
    score = 0
    if wanted_title and title:
        if wanted_title == title:
            score += 6
        elif wanted_title in title or title in wanted_title:
            score += 3
    wanted_author = clean_author(book.get('author'))
    author_blob = ' '.join(a.lower() for a in authors if a)
    if wanted_author and wanted_author.lower() in author_blob:
        score += 3
    if not wanted_author and author_blob:
        score += 1
    return score


def pick_google(book: dict[str, Any]) -> dict[str, Any] | None:
    params = {
        'q': ' '.join(filter(None, [f'intitle:{clean_title(book.get("title", ""))}', f'inauthor:{clean_author(book.get("author"))}' if clean_author(book.get('author')) else ''])),
        'maxResults': '5',
        'printType': 'books',
    }
    data = fetch_json(GOOGLE_API, params)
    items = data.get('items') or []
    best: tuple[int, dict[str, Any]] | None = None
    for item in items:
        info = item.get('volumeInfo') or {}
        cover = normalize_google_cover((info.get('imageLinks') or {}).get('thumbnail') or (info.get('imageLinks') or {}).get('smallThumbnail'))
        authors = info.get('authors') or []
        candidate = {
            'title': info.get('title') or '',
            'cover_url': cover,
            'authors': authors,
            'source': 'google',
        }
        score = score_candidate(book, candidate['title'], authors)
        if cover:
            score += 4
        if best is None or score > best[0]:
            best = (score, candidate)
    return best[1] if best else None


def pick_open_library(book: dict[str, Any]) -> dict[str, Any] | None:
    params = {
        'title': clean_title(book.get('title', '')),
        'limit': '5',
        'fields': 'title,author_name,cover_i',
    }
    author = clean_author(book.get('author'))
    if author:
        params['author'] = author
    data = fetch_json(OPEN_LIBRARY_SEARCH, params)
    docs = data.get('docs') or []
    best: tuple[int, dict[str, Any]] | None = None
    for doc in docs:
        cover_i = doc.get('cover_i')
        cover = OPEN_LIBRARY_COVER.format(cover_id=cover_i) if cover_i else None
        authors = doc.get('author_name') or []
        candidate = {
            'title': doc.get('title') or '',
            'cover_url': cover,
            'authors': authors,
            'source': 'openlibrary',
        }
        score = score_candidate(book, candidate['title'], authors)
        if cover:
            score += 4
        if best is None or score > best[0]:
            best = (score, candidate)
    return best[1] if best else None


def pick_douban(book: dict[str, Any]) -> dict[str, Any] | None:
    response = SESSION.get(DOUBAN_SEARCH, params={'search_text': clean_title(book.get('title', '')), 'cat': '1001'}, timeout=25)
    response.raise_for_status()
    sleep()
    match = re.search(r'window\.__DATA__\s*=\s*(\{.*?\})\s*;</script>', response.text, re.S)
    if not match:
        match = re.search(r'window\.__DATA__\s*=\s*(\{.*?\})\s*(?:\n|$)', response.text, re.S)
    if not match:
        return None
    payload = json.loads(match.group(1))
    items = payload.get('items') or []
    best: tuple[int, dict[str, Any]] | None = None
    for item in items:
        authors = []
        abstract = item.get('abstract') or ''
        if abstract:
            authors = [abstract.split('/')[0].strip()]
        candidate = {
            'title': item.get('title') or '',
            'cover_url': item.get('cover_url'),
            'authors': authors,
            'source': 'douban',
        }
        score = score_candidate(book, candidate['title'], authors)
        if candidate['cover_url']:
            score += 5
        if best is None or score > best[0]:
            best = (score, candidate)
    return best[1] if best else None


def should_fill_author(value: str | None) -> bool:
    text = (value or '').strip().lower()
    return not text or text in {'unknown', 'unknown author'}


def save_jpeg(image: Image.Image) -> bytes:
    best: bytes | None = None
    for quality in range(85, 24, -5):
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=quality, optimize=True, progressive=True)
        data = buffer.getvalue()
        best = data
        if len(data) <= MAX_BYTES:
            return data
    return best or b''


def optimize_image(content: bytes) -> bytes:
    image = Image.open(io.BytesIO(content)).convert('RGB')
    fitted = ImageOps.contain(image, TARGET_SIZE, Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', TARGET_SIZE, (248, 244, 238))
    x = (TARGET_SIZE[0] - fitted.width) // 2
    y = (TARGET_SIZE[1] - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    return save_jpeg(canvas)


def create_placeholder_cover(book: dict[str, Any], destination: Path) -> bool:
    palette = [
        ((137, 83, 209), (59, 130, 246)),
        ((236, 72, 153), (190, 24, 93)),
        ((16, 185, 129), (4, 120, 87)),
        ((245, 158, 11), (217, 119, 6)),
        ((99, 102, 241), (67, 56, 202)),
    ]
    seed = sum(ord(ch) for ch in book.get('title', ''))
    start, end = palette[seed % len(palette)]
    image = Image.new('RGB', TARGET_SIZE, start)
    draw = ImageDraw.Draw(image)
    for y in range(TARGET_SIZE[1]):
        ratio = y / max(1, TARGET_SIZE[1] - 1)
        color = tuple(int(start[i] * (1 - ratio) + end[i] * ratio) for i in range(3))
        draw.line((0, y, TARGET_SIZE[0], y), fill=color)
    draw.rounded_rectangle((18, 18, TARGET_SIZE[0] - 18, TARGET_SIZE[1] - 18), radius=18, outline=(255, 255, 255), width=2)

    title = clean_title(book.get('title', '')) or book.get('title', '')
    author = clean_author(book.get('author')) or 'Author unknown'
    font_title = ImageFont.load_default()
    font_meta = ImageFont.load_default()
    title_ascii = ascii_slug(title) or ascii_slug(' '.join(lazy_pinyin(title))) or 'book'
    author_ascii = ascii_slug(author) or ascii_slug(' '.join(lazy_pinyin(author))) or 'author-unknown'

    def wrap(text: str, width: int) -> list[str]:
        lines: list[str] = []
        current = ''
        for ch in text:
            trial = current + ch
            box = draw.textbbox((0, 0), trial, font=font_title)
            if current and box[2] > width:
                lines.append(current)
                current = ch
            else:
                current = trial
        if current:
            lines.append(current)
        return lines[:6]

    lines = wrap(title_ascii[:60], TARGET_SIZE[0] - 56)
    y = 70
    for line in lines:
        draw.text((28, y), line, fill='white', font=font_title)
        y += 24
    draw.text((28, TARGET_SIZE[1] - 80), author_ascii[:28], fill=(245, 245, 245), font=font_meta)
    draw.text((28, TARGET_SIZE[1] - 52), 'rexliu library', fill=(230, 230, 230), font=font_meta)
    destination.write_bytes(save_jpeg(image))
    return destination.exists() and destination.stat().st_size > 0


def download_cover(url: str, destination: Path) -> bool:
    response = SESSION.get(url, timeout=40)
    response.raise_for_status()
    sleep()
    data = optimize_image(response.content)
    destination.write_bytes(data)
    return destination.exists() and destination.stat().st_size > 0


def main() -> int:
    books = load_books()
    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    used_slugs = set()
    existing_cover_names = {Path(book.get('cover', '')).stem for book in books if book.get('cover')}
    used_slugs.update(filter(None, existing_cover_names))

    stats = {
        'book_cover_success': 0,
        'book_cover_failed': 0,
        'author_fixed': 0,
        'marked_needs_manual': 0,
        'existing_cover_kept': 0,
        'placeholder_generated': 0,
    }

    for book in books:
        if not book.get('slug'):
            book['slug'] = slugify(book.get('title', ''), used_slugs)
        else:
            used_slugs.add(book['slug'])

        cover_path = COVERS_DIR / f"{book['slug']}.jpg"
        has_existing_cover = bool(book.get('cover')) and cover_path.exists() and cover_path.stat().st_size > 0
        selected = None

        try:
            selected = pick_google(book)
        except Exception:
            selected = None
        if not selected or not selected.get('cover_url') or (should_fill_author(book.get('author')) and not selected.get('authors')):
            try:
                fallback = pick_open_library(book)
            except Exception:
                fallback = None
            if fallback and ((not selected) or score_candidate(book, fallback.get('title', ''), fallback.get('authors') or []) >= score_candidate(book, selected.get('title', ''), selected.get('authors') or [])):
                selected = fallback
        if not selected or not selected.get('cover_url') or (should_fill_author(book.get('author')) and not selected.get('authors')):
            try:
                fallback = pick_douban(book)
            except Exception:
                fallback = None
            if fallback and ((not selected) or score_candidate(book, fallback.get('title', ''), fallback.get('authors') or []) >= score_candidate(book, selected.get('title', ''), selected.get('authors') or [])):
                selected = fallback

        if should_fill_author(book.get('author')) and selected and selected.get('authors'):
            book['author'] = ', '.join(selected['authors'])
            book.pop(NEEDS_MANUAL, None)
            stats['author_fixed'] += 1

        if has_existing_cover:
            book['cover'] = f"/covers/books/{book['slug']}.jpg"
            stats['book_cover_success'] += 1
            stats['existing_cover_kept'] += 1
            continue

        if selected and selected.get('cover_url'):
            try:
                if download_cover(selected['cover_url'], cover_path):
                    book['cover'] = f"/covers/books/{book['slug']}.jpg"
                    stats['book_cover_success'] += 1
                    print(f"cover ✓ {book['title']} [{selected['source']}]")
                    continue
            except Exception as exc:
                print(f"cover ✗ {book['title']} ({selected['source']}): {exc}")

        if cover_path.exists() and cover_path.stat().st_size > 0:
            book['cover'] = f"/covers/books/{book['slug']}.jpg"
            stats['book_cover_success'] += 1
        else:
            try:
                if create_placeholder_cover(book, cover_path):
                    book['cover'] = f"/covers/books/{book['slug']}.jpg"
                    stats['book_cover_success'] += 1
                    stats['placeholder_generated'] += 1
                    print(f"placeholder ✓ {book['title']}")
                else:
                    book.pop('cover', None)
                    stats['book_cover_failed'] += 1
                    print(f"cover - {book['title']}")
            except Exception as exc:
                book.pop('cover', None)
                stats['book_cover_failed'] += 1
                print(f"placeholder ✗ {book['title']}: {exc}")

        if should_fill_author(book.get('author')):
            book[NEEDS_MANUAL] = True
            stats['marked_needs_manual'] += 1

    for book in books:
        if not should_fill_author(book.get('author')):
            book.pop(NEEDS_MANUAL, None)

    save_books(books)

    final_unknown = sum(1 for book in books if should_fill_author(book.get('author')))
    total_covers = sum(1 for book in books if book.get('cover'))
    print(json.dumps({
        'book_cover_success': total_covers,
        'book_cover_failed': len(books) - total_covers,
        'author_fixed': stats['author_fixed'],
        'placeholder_generated': stats['placeholder_generated'],
        'unknown_author_remaining': final_unknown,
        'needs_manual_count': sum(1 for book in books if book.get(NEEDS_MANUAL)),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
