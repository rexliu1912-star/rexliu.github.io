#!/usr/bin/env python3
from __future__ import annotations

import io
import json
import os
import re
import time
import unicodedata
from pathlib import Path
from typing import Any

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pypinyin import lazy_pinyin

ROOT = Path(__file__).resolve().parent.parent
MEDIA_PATH = ROOT / 'src/data/media.json'
COVERS_DIR = ROOT / 'public/covers/media'
OPENCLAW_CONFIG = Path.home() / '.openclaw/openclaw.json'
TMDB_BASE = 'https://api.themoviedb.org/3'
TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500'
PROXY = 'http://127.0.0.1:7890'
REQUEST_DELAY = 0.5
MAX_BYTES = 50 * 1024
TARGET_SIZE = (300, 450)
USER_AGENT = 'rexliu-website-library-media-fetcher/phase1'
MANUAL_YEAR_MAP = {
    '锦衣卫': 2010,
    '雾山五行': 2020,
    '猎鹰与冬兵': 2021,
    '人世间': 2022,
    '三体': 2023,
    '亿万': 2016,
    '双城之战': 2021,
    '觉醒年代': 2021,
    '功勋': 2021,
    '美国谍梦': 2013,
    '我的团长我的团': 2009,
    '洛基': 2021,
    '武林外传': 2006,
    '旺达幻视': 2021,
    '我的前半生': 2017,
    '纸牌屋': 2013,
    '越狱': 2005,
    '权力的游戏': 2011,
    '黑镜': 2011,
    '墨雨云间': 2024,
    '繁花': 2023,
    '仙剑奇侠传': 2005,
    'The Innocent': 2021,
}

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': USER_AGENT, 'Accept': 'application/json,image/*,*/*;q=0.8'})
for key in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY'):
    os.environ.setdefault(key, PROXY)
SESSION.proxies.update({'http': os.environ.get('HTTP_PROXY', PROXY), 'https': os.environ.get('HTTPS_PROXY', PROXY)})


def sleep() -> None:
    time.sleep(REQUEST_DELAY)


def load_media() -> list[dict[str, Any]]:
    return json.loads(MEDIA_PATH.read_text(encoding='utf-8'))


def save_media(items: list[dict[str, Any]]) -> None:
    MEDIA_PATH.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def ascii_slug(text: str) -> str:
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^a-zA-Z0-9]+', '-', text.lower()).strip('-')


def slugify(title: str, used: set[str]) -> str:
    base = (title or '').strip()
    slug = ascii_slug(base) or ascii_slug(' '.join(lazy_pinyin(base))) or 'media'
    slug = slug[:40].strip('-') or 'media'
    candidate = slug
    index = 2
    while candidate in used:
        suffix = f'-{index}'
        candidate = (slug[: max(1, 40 - len(suffix))].rstrip('-') + suffix).strip('-')
        index += 1
    used.add(candidate)
    return candidate


def load_tmdb_key() -> str | None:
    if os.environ.get('TMDB_API_KEY'):
        return os.environ['TMDB_API_KEY']
    if OPENCLAW_CONFIG.exists():
        try:
            data = json.loads(OPENCLAW_CONFIG.read_text(encoding='utf-8'))
            env = data.get('env') or {}
            vars_map = env.get('vars') or {}
            if vars_map.get('TMDB_API_KEY'):
                return vars_map['TMDB_API_KEY']
        except Exception:
            return None
    return None


def fetch_json(url: str, params: dict[str, str]) -> dict[str, Any]:
    response = SESSION.get(url, params=params, timeout=25)
    response.raise_for_status()
    sleep()
    return response.json()


def score_result(item: dict[str, Any], candidate: dict[str, Any], media_type: str) -> int:
    wanted = (item.get('title') or '').strip().lower()
    title = (candidate.get('title') or '').strip().lower()
    original = (candidate.get('original_title') or '').strip().lower()
    score = 0
    if wanted and title:
        if wanted == title or wanted == original:
            score += 8
        elif wanted in title or title in wanted or wanted in original or original in wanted:
            score += 4
    if candidate.get('poster_path'):
        score += 4
    if candidate.get('media_type') == media_type:
        score += 2
    if candidate.get('release_date') or candidate.get('first_air_date'):
        score += 1
    return score


def search_tmdb(item: dict[str, Any], api_key: str) -> dict[str, Any] | None:
    media_type = 'tv' if item.get('type') == 'series' else 'movie'
    url = f'{TMDB_BASE}/search/{media_type}'
    params = {'api_key': api_key, 'query': item.get('title', ''), 'language': 'zh-CN', 'include_adult': 'false'}
    data = fetch_json(url, params)
    results = data.get('results') or []
    if not results and item.get('titleEn'):
        params['query'] = item['titleEn']
        data = fetch_json(url, params)
        results = data.get('results') or []
    best: tuple[int, dict[str, Any]] | None = None
    for candidate in results:
        candidate = dict(candidate)
        candidate['media_type'] = media_type
        score = score_result(item, candidate, media_type)
        if best is None or score > best[0]:
            best = (score, candidate)
    return best[1] if best else None


def save_jpeg(image: Image.Image) -> bytes:
    best = None
    for quality in range(85, 24, -5):
        buf = io.BytesIO()
        image.save(buf, format='JPEG', quality=quality, optimize=True, progressive=True)
        data = buf.getvalue()
        best = data
        if len(data) <= MAX_BYTES:
            return data
    return best or b''


def optimize_image(content: bytes) -> bytes:
    image = Image.open(io.BytesIO(content)).convert('RGB')
    fitted = ImageOps.contain(image, TARGET_SIZE, Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', TARGET_SIZE, (20, 20, 20))
    x = (TARGET_SIZE[0] - fitted.width) // 2
    y = (TARGET_SIZE[1] - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    return save_jpeg(canvas)


def create_placeholder_cover(item: dict[str, Any], destination: Path) -> bool:
    palette = [((137, 83, 209), (37, 99, 235)), ((239, 68, 68), (127, 29, 29)), ((245, 158, 11), (146, 64, 14)), ((16, 185, 129), (5, 150, 105))]
    seed = sum(ord(ch) for ch in item.get('title', ''))
    start, end = palette[seed % len(palette)]
    image = Image.new('RGB', TARGET_SIZE, start)
    draw = ImageDraw.Draw(image)
    for y in range(TARGET_SIZE[1]):
        ratio = y / max(1, TARGET_SIZE[1] - 1)
        color = tuple(int(start[i] * (1 - ratio) + end[i] * ratio) for i in range(3))
        draw.line((0, y, TARGET_SIZE[0], y), fill=color)
    draw.rounded_rectangle((20, 20, TARGET_SIZE[0] - 20, TARGET_SIZE[1] - 20), radius=18, outline=(255, 255, 255), width=2)
    font = ImageFont.load_default()
    title = ascii_slug(item.get('title') or '') or ascii_slug(' '.join(lazy_pinyin(item.get('title') or ''))) or 'media'
    y = 90
    line = ''
    for chunk in re.split(r'[-\s]+', title):
        trial = (line + ' ' + chunk).strip()
        if len(trial) > 22 and line:
            draw.text((28, y), line, fill='white', font=font)
            y += 20
            line = chunk
        else:
            line = trial
    if line:
        draw.text((28, y), line, fill='white', font=font)
    draw.text((28, TARGET_SIZE[1] - 54), item.get('type', 'media'), fill=(240, 240, 240), font=font)
    destination.write_bytes(save_jpeg(image))
    return destination.exists() and destination.stat().st_size > 0


def download_cover(url: str, destination: Path) -> bool:
    response = SESSION.get(url, timeout=40)
    response.raise_for_status()
    sleep()
    destination.write_bytes(optimize_image(response.content))
    return destination.exists() and destination.stat().st_size > 0


def year_from_result(result: dict[str, Any]) -> int | None:
    raw = result.get('release_date') or result.get('first_air_date') or ''
    match = re.match(r'(\d{4})', raw)
    return int(match.group(1)) if match else None


def main() -> int:
    api_key = load_tmdb_key()
    media_items = load_media()
    skipped_tmdb = not api_key
    if skipped_tmdb:
        print('TMDB_API_KEY not found in environment or ~/.openclaw/openclaw.json env.vars. Falling back to manual years + local placeholder covers.')

    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    used_slugs = {Path(item.get('cover', '')).stem for item in media_items if item.get('cover')}
    year_filled = 0
    placeholder_generated = 0

    for item in media_items:
        if not item.get('slug'):
            item['slug'] = slugify(item.get('title') or item.get('titleEn') or 'media', used_slugs)
        else:
            used_slugs.add(item['slug'])

        cover_path = COVERS_DIR / f"{item['slug']}.jpg"
        existing_cover_ok = bool(item.get('cover')) and cover_path.exists() and cover_path.stat().st_size > 0
        result = None
        if api_key:
            try:
                result = search_tmdb(item, api_key)
            except Exception as exc:
                print(f"search ✗ {item.get('title')}: {exc}")

        if not item.get('year'):
            year = year_from_result(result) if result else MANUAL_YEAR_MAP.get(item.get('title')) or MANUAL_YEAR_MAP.get(item.get('titleEn'))
            if year:
                item['year'] = year
                year_filled += 1

        if existing_cover_ok:
            item['cover'] = f"/covers/media/{item['slug']}.jpg"
            continue

        poster_path = result.get('poster_path') if result else None
        if poster_path:
            try:
                if download_cover(f'{TMDB_IMAGE}{poster_path}', cover_path):
                    item['cover'] = f"/covers/media/{item['slug']}.jpg"
                    print(f"cover ✓ {item.get('title')}")
                    continue
            except Exception as exc:
                print(f"cover ✗ {item.get('title')}: {exc}")

        if cover_path.exists() and cover_path.stat().st_size > 0:
            item['cover'] = f"/covers/media/{item['slug']}.jpg"
        else:
            if create_placeholder_cover(item, cover_path):
                item['cover'] = f"/covers/media/{item['slug']}.jpg"
                placeholder_generated += 1
                print(f"placeholder ✓ {item.get('title')}")
            else:
                item.pop('cover', None)
                print(f"cover - {item.get('title')}")

    save_media(media_items)
    print(json.dumps({
        'media_cover_success': sum(1 for item in media_items if item.get('cover')),
        'media_cover_failed': sum(1 for item in media_items if not item.get('cover')),
        'year_filled': year_filled,
        'year_missing_remaining': sum(1 for item in media_items if not item.get('year')),
        'placeholder_generated': placeholder_generated,
        'skipped_tmdb': skipped_tmdb,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
