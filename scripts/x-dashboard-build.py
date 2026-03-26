#!/usr/bin/env python3
"""Build public X growth dashboard JSON from exported X analytics CSV files.

Usage:
    python3 scripts/x-dashboard-build.py [--overview PATH] [--content PATH] [--out PATH] [--site-json PATH] [--current-followers 6423]
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from statistics import mean
from typing import Any

DEFAULT_OVERVIEW = Path("../inbox/misc/account_overview_analytics.csv")
DEFAULT_CONTENT = Path("../inbox/misc/account_analytics_content_2025-03-01_2026-03-26.csv")
DEFAULT_OUT = Path("../output/x-growth/public-dashboard.json")
DEFAULT_SITE_JSON = Path("public/data/dashboard.json")


@dataclass
class DailyOverview:
    day: date
    impressions: int
    engagements: int
    new_follows: int
    unfollows: int
    profile_visits: int
    posts_created: int


@dataclass
class TweetRecord:
    post_id: str
    day: date
    text: str
    url: str
    impressions: int
    likes: int
    engagements: int
    bookmarks: int
    shares: int
    new_follows: int
    replies: int
    reposts: int
    profile_visits: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--overview", type=Path, default=DEFAULT_OVERVIEW, help="Path to account overview CSV")
    parser.add_argument("--content", type=Path, default=DEFAULT_CONTENT, help="Path to tweet-level content CSV")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Where to write the generated dashboard JSON")
    parser.add_argument(
        "--site-json",
        type=Path,
        default=DEFAULT_SITE_JSON,
        help="Where to copy the public dashboard JSON for the website",
    )
    parser.add_argument(
        "--current-followers",
        type=int,
        default=6423,
        help="Current follower count used as the end point when reconstructing history",
    )
    return parser.parse_args()


def parse_day(value: str) -> date:
    return datetime.strptime(value.strip(), "%a, %b %d, %Y").date()


def to_int(raw: str | None) -> int:
    if raw is None:
        return 0
    raw = raw.strip().replace(",", "")
    if not raw:
        return 0
    return int(float(raw))


def read_overview(path: Path) -> list[DailyOverview]:
    rows: list[DailyOverview] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(
                DailyOverview(
                    day=parse_day(row["Date"]),
                    impressions=to_int(row.get("Impressions")),
                    engagements=to_int(row.get("Engagements")),
                    new_follows=to_int(row.get("New follows")),
                    unfollows=to_int(row.get("Unfollows")),
                    profile_visits=to_int(row.get("Profile visits")),
                    posts_created=to_int(row.get("Create Post")),
                )
            )
    return sorted(rows, key=lambda item: item.day)


def read_content(path: Path) -> list[TweetRecord]:
    rows: list[TweetRecord] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if not row.get("Post id") or not (row.get("Date") or "").strip():
                continue
            rows.append(
                TweetRecord(
                    post_id=row["Post id"].strip(),
                    day=parse_day(row["Date"]),
                    text=(row.get("Post text") or "").strip(),
                    url=(row.get("Post Link") or "").strip(),
                    impressions=to_int(row.get("Impressions")),
                    likes=to_int(row.get("Likes")),
                    engagements=to_int(row.get("Engagements")),
                    bookmarks=to_int(row.get("Bookmarks")),
                    shares=to_int(row.get("Shares")),
                    new_follows=to_int(row.get("New follows")),
                    replies=to_int(row.get("Replies")),
                    reposts=to_int(row.get("Reposts")),
                    profile_visits=to_int(row.get("Profile visits")),
                )
            )
    return sorted(rows, key=lambda item: item.day)


def iso_week_key(day: date) -> str:
    iso_year, iso_week, _ = day.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def build_follower_history(overview_rows: list[DailyOverview], current_followers: int) -> list[dict[str, Any]]:
    if not overview_rows:
        return []
    history_desc: list[tuple[date, int]] = []
    running_followers = current_followers
    for row in sorted(overview_rows, key=lambda item: item.day, reverse=True):
        history_desc.append((row.day, running_followers))
        running_followers -= row.new_follows - row.unfollows
    return [
        {"date": day.isoformat(), "count": count}
        for day, count in sorted(history_desc, key=lambda item: item[0])
    ]


def build_weekly_stats(overview_rows: list[DailyOverview], tweets: list[TweetRecord]) -> list[dict[str, Any]]:
    week_map: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "tweets": 0,
            "totalEngagement": 0,
            "totalViews": 0,
            "profileVisits": 0,
            "newFollowers": 0,
            "days": [],
            "bestTweet": None,
        }
    )

    for row in overview_rows:
        key = iso_week_key(row.day)
        week_map[key]["totalEngagement"] += row.engagements
        week_map[key]["totalViews"] += row.impressions
        week_map[key]["profileVisits"] += row.profile_visits
        week_map[key]["newFollowers"] += row.new_follows - row.unfollows
        week_map[key]["days"].append(row.day)

    for tweet in tweets:
        key = iso_week_key(tweet.day)
        week_map[key]["tweets"] += 1
        current_best = week_map[key]["bestTweet"]
        if current_best is None or tweet.engagements > current_best["engagements"]:
            week_map[key]["bestTweet"] = {
                "id": tweet.post_id,
                "text": tweet.text,
                "likes": tweet.likes,
                "views": tweet.impressions,
                "engagements": tweet.engagements,
                "url": tweet.url,
                "date": tweet.day.isoformat(),
            }

    ordered_keys = sorted(week_map.keys())
    result: list[dict[str, Any]] = []
    previous_engagement = None
    for key in ordered_keys:
        payload = week_map[key]
        total_engagement = payload["totalEngagement"]
        tweets_count = payload["tweets"]
        growth = None
        if previous_engagement is not None:
            if previous_engagement != 0:
                delta = ((total_engagement - previous_engagement) / previous_engagement) * 100
                growth = f"{delta:+.1f}%"
        previous_engagement = total_engagement
        days = sorted(payload["days"])
        result.append(
            {
                "week": key,
                "startDate": days[0].isoformat() if days else None,
                "endDate": days[-1].isoformat() if days else None,
                "tweets": tweets_count,
                "totalEngagement": total_engagement,
                "avgEngagement": round(total_engagement / tweets_count, 2) if tweets_count else 0,
                "totalViews": payload["totalViews"],
                "profileVisits": payload["profileVisits"],
                "newFollowers": payload["newFollowers"],
                "growthRate": growth,
                "bestTweet": payload["bestTweet"],
            }
        )
    return result


def build_recent_tweets(tweets: list[TweetRecord], days: int = 30, limit: int = 10) -> list[dict[str, Any]]:
    if not tweets:
        return []
    latest = max(tweet.day for tweet in tweets)
    cutoff = latest - timedelta(days=days - 1)
    recent = [tweet for tweet in tweets if tweet.day >= cutoff]
    ranked = sorted(recent, key=lambda item: (item.impressions, item.engagements, item.likes), reverse=True)[:limit]
    return [
        {
            "id": tweet.post_id,
            "text": tweet.text,
            "likes": tweet.likes,
            "views": tweet.impressions,
            "engagements": tweet.engagements,
            "retweets": tweet.reposts,
            "replies": tweet.replies,
            "bookmarks": tweet.bookmarks,
            "date": tweet.day.isoformat(),
            "url": tweet.url,
        }
        for tweet in ranked
    ]


def build_milestones(follower_history: list[dict[str, Any]]) -> list[dict[str, str]]:
    thresholds = [1000, 2000, 3000, 4000, 5000, 6000]
    milestones: list[dict[str, str]] = []
    for threshold in thresholds:
        reached = next((item for item in follower_history if item["count"] >= threshold), None)
        if reached:
            milestones.append({"date": reached["date"], "label": f"{threshold // 1000}K followers", "count": threshold})
    return milestones


def build_dashboard(overview_rows: list[DailyOverview], tweets: list[TweetRecord], current_followers: int) -> dict[str, Any]:
    follower_history = build_follower_history(overview_rows, current_followers)
    weekly_stats = build_weekly_stats(overview_rows, tweets)
    recent_tweets = build_recent_tweets(tweets)
    total_impressions = sum(row.impressions for row in overview_rows)
    avg_weekly_engagement = round(mean(week["totalEngagement"] for week in weekly_stats), 2) if weekly_stats else 0
    this_week = weekly_stats[-1] if weekly_stats else None
    previous_week = weekly_stats[-2] if len(weekly_stats) > 1 else None
    latest_overview_day = overview_rows[-1].day if overview_rows else None

    content_mix: dict[str, Any] = {}

    return {
        "lastUpdated": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "dateRange": {
            "start": overview_rows[0].day.isoformat() if overview_rows else None,
            "end": latest_overview_day.isoformat() if latest_overview_day else None,
        },
        "profile": {
            "handle": "@rexliu",
            "followers": current_followers,
            "totalImpressions": total_impressions,
            "totalTweetsAnalyzed": len(tweets),
        },
        "heroStats": {
            "currentFollowers": current_followers,
            "totalImpressions": total_impressions,
            "avgWeeklyEngagement": avg_weekly_engagement,
        },
        "followerHistory": follower_history,
        "weeklyStats": weekly_stats,
        "thisWeek": {
            "week": this_week["week"] if this_week else None,
            "tweets": this_week["tweets"] if this_week else 0,
            "views": this_week["totalViews"] if this_week else 0,
            "engagement": this_week["totalEngagement"] if this_week else 0,
            "growthRate": this_week["growthRate"] if this_week else None,
            "previousWeekViews": previous_week["totalViews"] if previous_week else None,
            "previousWeekEngagement": previous_week["totalEngagement"] if previous_week else None,
            "bestTweet": this_week["bestTweet"] if this_week else None,
        },
        "recentTweets": recent_tweets,
        "contentMix": content_mix,
        "milestones": build_milestones(follower_history),
        "notes": {
            "contentMixAvailable": bool(content_mix),
            "contentMixReason": "hook_type column not found in source export; radar falls back to engagement distribution.",
        },
    }


def main() -> None:
    args = parse_args()
    overview_rows = read_overview(args.overview)
    tweets = read_content(args.content)
    dashboard = build_dashboard(overview_rows, tweets, args.current_followers)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(dashboard, ensure_ascii=False, indent=2), encoding="utf-8")

    args.site_json.parent.mkdir(parents=True, exist_ok=True)
    args.site_json.write_text(json.dumps(dashboard, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote dashboard JSON to {args.out}")
    print(f"Copied dashboard JSON to {args.site_json}")
    print(json.dumps({
        "followers": dashboard["profile"]["followers"],
        "weeklyStats": len(dashboard["weeklyStats"]),
        "recentTweets": len(dashboard["recentTweets"]),
        "milestones": len(dashboard["milestones"]),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
