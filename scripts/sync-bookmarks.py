#!/usr/bin/env python3
"""Sync Twitter bookmarks to Astro content collection markdown files."""

import json
import os
import re
import subprocess
import sys
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


def main():
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

    added = 0
    skipped = 0

    today = date.today().isoformat()

    for bm in bookmarks:
        tweet_id = bm["id"]
        filepath = os.path.join(CONTENT_DIR, f"{tweet_id}.md")

        if os.path.exists(filepath):
            skipped += 1
            continue

        text = bm.get("text", "")
        card_title = bm.get("card_title", "")
        avatar = bm.get("avatar", "")
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

        added += 1

    total = added + skipped
    print(f"\n✅ Done! Added {added}, skipped {skipped} (already exist), total {total}")


if __name__ == "__main__":
    main()
