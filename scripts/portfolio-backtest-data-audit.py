#!/usr/bin/env python3
"""Audit local data coverage for portfolio allocation backtesting."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parents[1]
DATA = WORKSPACE / "data"
MARKET = DATA / "market"


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def date_range(dates: list[str]) -> dict[str, Any]:
    clean = sorted({d for d in dates if isinstance(d, str) and len(d) >= 10})
    return {
        "start": clean[0] if clean else None,
        "end": clean[-1] if clean else None,
        "observations": len(clean),
    }


def source_summary(path: Path, dates: list[str], fields: list[str], quality: str, notes: list[str] | None = None) -> dict[str, Any]:
    summary = date_range(dates)
    summary.update({
        "path": str(path),
        "exists": path.exists(),
        "fields": fields,
        "quality": quality,
        "notes": notes or [],
    })
    return summary


def audit() -> dict[str, Any]:
    market_files = sorted(MARKET.glob("20??-??-??.json"))
    market_dates = [p.stem for p in market_files]

    crypto_path = DATA / "crypto-timeseries.json"
    crypto = read_json(crypto_path, {}) or {}
    crypto_rows = crypto.get("data") or []
    crypto_dates = [str(r.get("date")) for r in crypto_rows if isinstance(r, dict) and r.get("date")]
    btc_count = sum(1 for r in crypto_rows if isinstance(r, dict) and r.get("btc_close"))
    fgi_count = sum(1 for r in crypto_rows if isinstance(r, dict) and r.get("fgi") is not None)

    gold_path = DATA / "gold-timeseries.json"
    gold = read_json(gold_path, {}) or {}
    gold_rows = gold.get("data") or []
    gold_dates = [str(r.get("date")) for r in gold_rows if isinstance(r, dict) and r.get("date")]
    xau_count = sum(1 for r in gold_rows if isinstance(r, dict) and r.get("xau_usd"))

    analytics_path = MARKET / "portfolio-analytics-history.json"
    analytics = read_json(analytics_path, []) or []
    analytics_dates = [str(r.get("date")) for r in analytics if isinstance(r, dict) and r.get("date")]

    health_path = MARKET / "health-indicators-latest.json"
    beta_path = MARKET / "portfolio-beta.json"
    quant_path = MARKET / "quant-ratings.json"
    sentiment_path = MARKET / "sentiment-latest.json"

    sources = {
        "market_snapshots": source_summary(
            MARKET,
            market_dates,
            ["sections.macro", "sections.crypto", "fear_greed", "treasury_10y", "sofr"],
            "medium" if len(market_dates) >= 30 else "weak",
            ["Dated snapshots are the main replay spine for model inputs."],
        ),
        "crypto_timeseries": source_summary(
            crypto_path,
            crypto_dates,
            ["btc_close", "fgi", "composite", "indicators"],
            "strong" if btc_count >= 120 else "medium" if btc_count >= 30 else "weak",
            [f"btc_close observations: {btc_count}", f"fgi observations: {fgi_count}"],
        ),
        "gold_timeseries": source_summary(
            gold_path,
            gold_dates,
            ["xau_usd", "m2_trillion", "premium_pct", "signal_status"],
            "strong" if xau_count >= 120 else "medium" if xau_count >= 30 else "weak",
            [f"xau_usd observations: {xau_count}"],
        ),
        "portfolio_analytics_history": source_summary(
            analytics_path,
            analytics_dates,
            ["health", "portfolio_beta", "equity_beta"],
            "weak" if len(analytics_dates) < 30 else "medium",
            ["Currently useful for recent health/beta replay, not long-horizon validation."],
        ),
        "latest_health_indicators": source_summary(health_path, [], ["gold_fair_value", "oil_premium", "smh_igv"], "latest_only" if health_path.exists() else "missing"),
        "latest_beta": source_summary(beta_path, [], ["portfolio_beta", "equity_beta"], "latest_only" if beta_path.exists() else "missing"),
        "latest_quant_ratings": source_summary(quant_path, [], ["portfolioHealth", "holdings"], "latest_only" if quant_path.exists() else "missing"),
        "latest_sentiment": source_summary(sentiment_path, [], ["vix", "breadth", "pcr"], "latest_only" if sentiment_path.exists() else "missing"),
    }

    # Conservative verdict: model-input snapshots are short even if gold/crypto returns have longer history.
    market_obs = sources["market_snapshots"]["observations"]
    min_return_obs = min(sources["crypto_timeseries"]["observations"], sources["gold_timeseries"]["observations"])
    if market_obs >= 252 and min_return_obs >= 252:
        verdict = "investment_grade"
    elif market_obs >= 20 and min_return_obs >= 60:
        verdict = "short_sanity_replay"
    else:
        verdict = "insufficient"

    coverage = {
        "market_snapshot_days": market_obs,
        "return_proxy_min_days": min_return_obs,
        "has_crypto_proxy": btc_count >= 20,
        "has_gold_proxy": xau_count >= 20,
        "has_long_health_beta_history": len(analytics_dates) >= 120,
        "needs_external_stock_proxy": True,
        "needs_historical_sentiment_or_proxy": market_obs < 252,
    }

    required = [
        {"bucket": "stablecoin", "status": "available", "source": "portfolio APR or default carry"},
        {"bucket": "funds", "status": "partial", "source": "SOFR/risk-free from market snapshots or fallback"},
        {"bucket": "gold", "status": "available" if xau_count >= 20 else "weak", "source": str(gold_path)},
        {"bucket": "stocks", "status": "needs_proxy", "source": "SPY/QQQ or real portfolio proxy"},
        {"bucket": "crypto", "status": "available" if btc_count >= 20 else "weak", "source": str(crypto_path)},
    ]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "verdict": verdict,
        "coverage": coverage,
        "sources": sources,
        "required_for_backtest": required,
        "next_steps": [
            "Build harness now, but label first run as short sanity replay unless external historical inputs extend model snapshots.",
            "Add SPY/QQQ stock proxy before judging return improvement.",
            "Refactor allocation model into pure snapshot function before replaying history.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(ROOT / "src/data/portfolio-backtest-data-audit.json"))
    args = parser.parse_args()
    result = audit()
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(f"✅ portfolio backtest data audit: {result['verdict']} -> {out}")


if __name__ == "__main__":
    main()
