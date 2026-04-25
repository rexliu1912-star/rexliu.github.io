#!/usr/bin/env python3
"""Sync Twitter bookmarks to Astro content collection markdown files.

Features:
- Dual source: CDP (full data) → opencli (basic) → fallback
- Auto-fetch avatars via unavatar.io (no Chrome dependency)
- --force: overwrite existing files to backfill missing fields
- --avatar-only: only update avatar fields for existing files
"""

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, date

CONTENT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "content", "bookmarks")

CATEGORY_KEYWORDS = {
    "ai": [
        "ai", "llm", "claude", "gpt", "agent", "coding", "vibe coding",
        "cursor", "codex", "openai", "anthropic", "gemini", "machine learning",
        "deep learning", "neural", "transformer", "diffusion", "midjourney",
        "stable diffusion", "copilot", "chatgpt", "prompt", "fine-tun",
        "rag", "embedding", "langchain", "autogpt", "model", "inference",
    ],
    "crypto": [
        "bitcoin", "btc", "eth", "ethereum", "defi", "web3", "blockchain",
        "token", "nft", "crypto", "solana", "sol", "cardano", "ada",
        "snek", "airdrop", "stablecoin", "usdc", "usdt", "dao", "dex",
        "swap", "liquidity", "yield", "staking", "wallet", "onchain",
        "on-chain", "l1", "l2", "rollup", "zk", "mev",
    ],
    "macro": [
        "fed", "fomc", "inflation", "gold", "s&p", "etf", "interest rate",
        "macro", "treasury", "bond", "cpi", "gdp", "recession", "tariff",
        "trade war", "dollar", "dxy", "yield curve", "rate cut", "rate hike",
        "powell", "nasdaq", "dow jones", "stock market",
    ],
    "builder": [
        "build", "ship", "launch", "startup", "product", "growth", "audience",
        "founder", "indie", "maker", "saas", "mvp", "iterate", "deploy",
        "side project", "bootstrapp", "solopreneur", "creator economy",
    ],
    "life": [
        "life", "travel", "family", "health", "mindset", "nomad", "wellness",
        "meditation", "journal", "routine", "habit", "stoic", "philosophy",
        "happiness", "gratitude", "balance", "burnout",
    ],
}

# Avatar cache: screen_name → avatar URL
_avatar_cache_file = os.path.join(os.path.dirname(__file__), ".avatar-cache.json")


def _load_avatar_cache():
    try:
        with open(_avatar_cache_file, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_avatar_cache(cache):
    with open(_avatar_cache_file, "w") as f:
        json.dump(cache, f)


def fetch_avatar(screen_name, cache):
    """Fetch Twitter avatar URL via unavatar.io, with local cache."""
    if not screen_name:
        return ""
    if screen_name in cache:
        return cache[screen_name]

    import urllib.request
    url = f"https://unavatar.io/twitter/{screen_name}?json=true"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        avatar_url = data.get("url", "")
        if avatar_url:
            cache[screen_name] = avatar_url
            return avatar_url
    except Exception:
        pass
    return ""


def classify(text: str) -> list[str]:
    """Classify tweet text into categories based on keyword matching."""
    lower = text.lower()
    cats = []
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                cats.append(cat)
                break
    return cats if cats else ["general"]


def escape_yaml_string(s: str) -> str:
    """Escape a string for safe YAML double-quoted output."""
    s = s.replace("\\", "\\\\")
    s = s.replace('"', '\\"')
    s = s.replace("\n", "\\n")
    s = s.replace("\r", "")
    s = s.replace("\t", "\\t")
    return s


def parse_twitter_date(date_str: str) -> str:
    """Parse Twitter date format to YYYY-MM-DD."""
    try:
        dt = datetime.strptime(date_str, "%a %b %d %H:%M:%S %z %Y")
        return dt.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return date.today().isoformat()


def parse_existing_frontmatter(filepath):
    """Parse existing frontmatter fields from a bookmark .md file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        # Extract yaml between --- markers
        m = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
        if not m:
            return {}
        yaml_str = m.group(1)
        fields = {}
        for line in yaml_str.split("\n"):
            if ":" in line:
                key, _, val = line.partition(":")
                key = key.strip()
                val = val.strip().strip('"')
                fields[key] = val
        return fields
    except Exception:
        return {}


def write_bookmark(filepath, bm, avatar=""):
    """Write a single bookmark .md file."""
    tweet_id = bm["id"]
    text = bm.get("text", "")
    card_title = bm.get("card_title", "")
    author_name = bm.get("author_name", bm.get("name", ""))
    categories = classify(text + " " + card_title)
    created = parse_twitter_date(bm.get("created_at", ""))

    frontmatter = f"""---
tweet_id: "{tweet_id}"
author: "{escape_yaml_string(bm.get('author', ''))}"
author_name: "{escape_yaml_string(author_name)}"
avatar: "{escape_yaml_string(avatar)}"
text: "{escape_yaml_string(text)}"
card_title: "{escape_yaml_string(card_title)}"
likes: {bm.get('likes', 0)}
retweets: {bm.get('retweets', 0)}
url: "{bm.get('url', '')}"
created_at: "{created}"
categories: {json.dumps(categories)}
---
"""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(frontmatter)


def main():
    force = "--force" in sys.argv
    avatar_only = "--avatar-only" in sys.argv

    if avatar_only:
        # Only update avatar fields for existing files
        _update_avatars_only()
        return

    # Fetch bookmarks — try CDP first (full data: avatar, card_title), fallback to opencli
    print("Fetching bookmarks from Twitter...")
    bookmarks = None

    # Method 1: CDP script (needs Chrome running — full data with avatar/card_title)
    fetch_script = os.path.expanduser("~/clawd/scripts/fetch-bookmarks-full.js")
    try:
        result = subprocess.run(
            ["node", fetch_script, "--limit", "100"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0 and result.stdout.strip():
            bookmarks = json.loads(result.stdout)
            print(f"  ✅ CDP: fetched {len(bookmarks)} bookmarks (full data)")
    except Exception as e:
        print(f"  ⚠️ CDP failed: {e}")

    # Method 2: fallback to opencli (no Chrome needed, but missing avatar/card_title)
    if not bookmarks:
        print("  Falling back to opencli...")
        try:
            result = subprocess.run(
                ["npx", "opencli", "twitter", "bookmarks", "--limit", "100", "--format", "json"],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=os.path.expanduser("~/clawd"),
            )
            if result.returncode == 0 and result.stdout.strip():
                bookmarks = json.loads(result.stdout)
                print(f"  ✅ opencli: fetched {len(bookmarks)} bookmarks (basic data)")
        except Exception as e:
            print(f"  ❌ opencli failed: {e}", file=sys.stderr)

    if not bookmarks:
        print("❌ All methods failed", file=sys.stderr)
        sys.exit(1)
    print(f"Fetched {len(bookmarks)} bookmarks")

    # Ensure output directory exists
    os.makedirs(CONTENT_DIR, exist_ok=True)

    # Load avatar cache
    avatar_cache = _load_avatar_cache()

    added = 0
    skipped = 0
    updated = 0

    today = date.today().isoformat()

    for bm in bookmarks:
        tweet_id = bm["id"]
        filepath = os.path.join(CONTENT_DIR, f"{tweet_id}.md")
        screen_name = bm.get("author", "")

        # Determine avatar
        avatar = bm.get("avatar", "")
        if not avatar and screen_name:
            avatar = fetch_avatar(screen_name, avatar_cache)
            if avatar:
                time.sleep(0.1)  # Rate limit: ~10 req/s

        if os.path.exists(filepath) and not force:
            skipped += 1
            continue

        if os.path.exists(filepath) and force:
            # Merge: keep existing non-empty fields if new data is empty
            existing = parse_existing_frontmatter(filepath)
            if not avatar and existing.get("avatar"):
                avatar = existing["avatar"]
            card_title = bm.get("card_title", "")
            if not card_title and existing.get("card_title"):
                bm["card_title"] = existing["card_title"]

        write_bookmark(filepath, bm, avatar)

        if os.path.exists(filepath) and force:
            updated += 1
        else:
            added += 1

    # Save avatar cache
    _save_avatar_cache(avatar_cache)

    total = added + skipped + updated
    print(f"\n✅ Done! Added {added}, updated {updated}, skipped {skipped}, total {total}")
    print(f"   Avatar cache: {len(avatar_cache)} entries")


def _update_avatars_only():
    """Update avatar fields for all existing bookmark files that lack them."""
    import urllib.request

    avatar_cache = _load_avatar_cache()
    updated = 0
    skipped = 0
    failed = 0

    files = sorted(
        f for f in os.listdir(CONTENT_DIR) if f.endswith(".md")
    )
    print(f"Scanning {len(files)} bookmark files for missing avatars...")

    for fname in files:
        filepath = os.path.join(CONTENT_DIR, fname)
        existing = parse_existing_frontmatter(filepath)

        if existing.get("avatar"):
            skipped += 1
            continue

        screen_name = existing.get("author", "")
        if not screen_name:
            failed += 1
            continue

        avatar = fetch_avatar(screen_name, avatar_cache)
        if not avatar:
            failed += 1
            continue

        # Rewrite the file with avatar filled in
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(
            r'^avatar: ""$',
            f'avatar: "{escape_yaml_string(avatar)}"',
            content,
            count=1,
            flags=re.MULTILINE,
        )
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        updated += 1
        time.sleep(0.15)  # Rate limit

    _save_avatar_cache(avatar_cache)
    print(f"\n✅ Avatar update: {updated} updated, {skipped} already had avatar, {failed} failed")
    print(f"   Avatar cache: {len(avatar_cache)} entries")


if __name__ == "__main__":
    main()
