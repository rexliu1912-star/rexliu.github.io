#!/usr/bin/env python3
"""
portfolio-allocation-model.py

Explainable v1 allocation engine for rexliu.io/portfolio.
It reads existing local market/portfolio data and emits model-driven targets,
expected returns, volatility assumptions, and rationales without exposing
absolute private account values.
"""
from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from statistics import pstdev
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parents[1]
DATA = WORKSPACE / "data"
MARKET = DATA / "market"
DEFAULT_OUTPUT = ROOT / "src/data/portfolio-model-targets.json"
PRIVATE_PORTFOLIO = WORKSPACE / "projects/the-workshop/data/portfolio.json"

BUCKETS = ["stablecoin", "funds", "gold", "stocks", "crypto"]
BASE_TARGETS = {
    "stablecoin": 30.0,
    "funds": 30.0,
    "gold": 5.0,
    "stocks": 25.0,
    "crypto": 10.0,
}
BOUNDS = {
    "stablecoin": (20.0, 45.0),
    "funds": (15.0, 45.0),
    "gold": (2.0, 10.0),
    "stocks": (15.0, 35.0),
    "crypto": (5.0, 15.0),
}
MAX_DAILY_MOVE_PP = 2.0
SMOOTHING_ALPHA = 0.35


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def latest_market_file() -> Path | None:
    files = sorted(MARKET.glob("20??-??-??.json"))
    return files[-1] if files else None


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def score_bool(status: str | None, good: set[str], bad: set[str]) -> float:
    if not status:
        return 0.0
    s = status.lower()
    if any(x in s for x in good):
        return 10.0
    if any(x in s for x in bad):
        return -10.0
    return 0.0


def annualized_vol(series: list[float], fallback: float) -> float:
    vals = [float(x) for x in series if isinstance(x, (int, float)) and x > 0]
    if len(vals) < 20:
        return fallback
    returns = [(vals[i] / vals[i - 1]) - 1 for i in range(1, len(vals)) if vals[i - 1] > 0]
    if len(returns) < 20:
        return fallback
    return round(clamp(pstdev(returns[-120:]) * math.sqrt(252) * 100, fallback * 0.5, fallback * 1.8), 1)


def normalize_with_bounds(raw: dict[str, float]) -> dict[str, float]:
    weights = {k: clamp(raw.get(k, BASE_TARGETS[k]), *BOUNDS[k]) for k in BUCKETS}
    for _ in range(12):
        total = sum(weights.values())
        diff = 100.0 - total
        if abs(diff) < 0.01:
            break
        adjustable = []
        for k in BUCKETS:
            lo, hi = BOUNDS[k]
            if diff > 0 and weights[k] < hi - 0.01:
                adjustable.append(k)
            elif diff < 0 and weights[k] > lo + 0.01:
                adjustable.append(k)
        if not adjustable:
            break
        step = diff / len(adjustable)
        for k in adjustable:
            weights[k] = clamp(weights[k] + step, *BOUNDS[k])
    rounded = {k: round(weights[k], 1) for k in BUCKETS}
    residual = round(100.0 - sum(rounded.values()), 1)
    if abs(residual) >= 0.1:
        # Put rounding dust into funds: lowest risk flexible reserve bucket.
        rounded["funds"] = round(rounded["funds"] + residual, 1)
    return rounded


def smooth_targets(raw: dict[str, float], previous: dict[str, float] | None) -> dict[str, float]:
    if not previous:
        return normalize_with_bounds(raw)
    smoothed = {}
    for k in BUCKETS:
        prev = previous.get(k, raw[k])
        candidate = prev * (1 - SMOOTHING_ALPHA) + raw[k] * SMOOTHING_ALPHA
        candidate = clamp(candidate, prev - MAX_DAILY_MOVE_PP, prev + MAX_DAILY_MOVE_PP)
        smoothed[k] = candidate
    return normalize_with_bounds(smoothed)


def current_allocation() -> dict[str, float]:
    private = read_json(PRIVATE_PORTFOLIO, {}) or {}
    total = private.get("totalAssets") or 0
    assets = {a.get("id"): a for a in private.get("assets", [])}
    if not total:
        return {}
    groups = {
        "stablecoin": ["stablecoin"],
        "funds": ["liquid", "yanerhigh", "house", "education", "receivable"],
        "stocks": ["qieman", "future", "rex_stock", "us_stock"],
        "crypto": ["crypto", "crypto_ivy"],
    }
    amounts = {k: sum((assets.get(i, {}) or {}).get("amount", 0) or 0 for i in ids) for k, ids in groups.items()}
    gold_amount = (((assets.get("future") or {}).get("breakdown") or {}).get("国泰黄金ETF_A") or {}).get("amount", 0) or 0
    amounts["gold"] = gold_amount
    amounts["stocks"] = max(0, amounts.get("stocks", 0) - gold_amount)
    return {k: round((v / total) * 100, 1) for k, v in amounts.items()}


def build_model(no_smooth: bool, output_path: Path) -> dict[str, Any]:
    latest_market = read_json(latest_market_file() or Path("/nonexistent"), {}) or {}
    sentiment = read_json(MARKET / "sentiment-latest.json", {}) or {}
    health = read_json(MARKET / "health-indicators-latest.json", {}) or {}
    beta = read_json(MARKET / "portfolio-beta.json", {}) or {}
    quant = read_json(MARKET / "quant-ratings.json", {}) or {}
    crypto_ts = read_json(DATA / "crypto-timeseries.json", {}) or {}
    crypto_state = read_json(DATA / "crypto-monitor-state.json", {}) or {}
    gold_tracker = read_json(DATA / "gold-tracker.json", {}) or {}
    gold_ts = read_json(DATA / "gold-timeseries.json", {}) or {}
    private = read_json(PRIVATE_PORTFOLIO, {}) or {}

    macro = ((latest_market.get("sections") or {}).get("macro") or {})
    crypto_market = ((latest_market.get("sections") or {}).get("crypto") or {})
    sent_ind = sentiment.get("indicators") or {}
    breadth_avg = (((sent_ind.get("breadth") or {}).get("average")) or 50)
    vix = ((sent_ind.get("vix") or {}).get("value") or 20)
    pcr_oi = ((sent_ind.get("pcr") or {}).get("pcr_oi") or 1.0)
    fgi = (((macro.get("fear_greed") or {}).get("value")) or ((crypto_ts.get("latest") or {}).get("fgi")) or 50)
    ten_y = ((macro.get("treasury_10y") or {}).get("value") or 4.0)
    sofr = ((macro.get("sofr") or {}).get("value") or 3.5)
    risk_free = round(clamp(float(sofr), 1.5, 6.0), 2)

    regime_score = 50.0
    regime_score += 10 if vix < 18 else -12 if vix > 25 else 0
    regime_score += 6 if breadth_avg >= 60 else -8 if breadth_avg < 45 else 0
    regime_score += -6 if pcr_oi >= 1.25 else 4 if pcr_oi < 0.9 else 0
    regime_score += 8 if (health.get("smh_igv") or {}).get("trend") == "risk-on" else 0
    regime_score += -7 if (health.get("oil_premium") or {}).get("level") in {"high", "extreme"} else 0
    regime_score += -7 if (health.get("gold_fair_value") or {}).get("level") in {"high", "extreme"} else 0
    regime_score += -5 if fgi < 30 else 5 if fgi > 60 else 0
    regime_score = round(clamp(regime_score, 0, 100), 1)
    if regime_score >= 65:
        regime = "risk_on"
    elif regime_score >= 45:
        regime = "neutral"
    elif regime_score >= 30:
        regime = "defensive"
    else:
        regime = "liquidity_stress"

    stable_apr = next((float(a.get("apr")) for a in private.get("assets", []) if a.get("id") == "stablecoin" and a.get("apr") is not None), 5.0)
    crypto_latest = crypto_ts.get("latest") or {}
    crypto_composite = crypto_latest.get("composite") or 50
    gold_signal = ((gold_tracker.get("signal") or {}).get("status") or "yellow").lower()
    gold_premium_level = ((health.get("gold_fair_value") or {}).get("level") or "normal").lower()
    portfolio_health = quant.get("portfolioHealth") or 3.5
    equity_beta = beta.get("equity_beta") or 1.2

    signal_scores = {
        "stablecoin": clamp(45 + stable_apr * 7 + (8 if regime in {"defensive", "liquidity_stress"} else 0), 0, 100),
        "funds": clamp(52 + risk_free * 5 + (8 if regime != "risk_on" else -4), 0, 100),
        "gold": clamp(55 + score_bool(gold_signal, {"green"}, {"red"}) + (-18 if gold_premium_level == "extreme" else -8 if gold_premium_level == "high" else 0), 0, 100),
        "stocks": clamp((portfolio_health / 5) * 65 + regime_score * 0.35, 0, 100),
        "crypto": clamp(float(crypto_composite) + (5 if fgi < 35 else -5 if fgi > 75 else 0), 0, 100),
    }

    raw = dict(BASE_TARGETS)
    regime_tilts = {
        "risk_on": {"stablecoin": -3, "funds": -2, "gold": 0, "stocks": 3, "crypto": 2},
        "neutral": {"stablecoin": 0, "funds": 0, "gold": 0, "stocks": 0, "crypto": 0},
        "defensive": {"stablecoin": 5, "funds": 3, "gold": 1, "stocks": -6, "crypto": -3},
        "liquidity_stress": {"stablecoin": 8, "funds": 5, "gold": 2, "stocks": -10, "crypto": -5},
    }[regime]
    signal_tilt_caps = {"stablecoin": 3, "funds": 3, "gold": 3, "stocks": 5, "crypto": 4}
    for k in BUCKETS:
        raw[k] += regime_tilts[k]
        raw[k] += ((signal_scores[k] - 50) / 50) * signal_tilt_caps[k]

    raw_targets = normalize_with_bounds(raw)
    previous = None
    if not no_smooth:
        prev_model = read_json(output_path, {}) or {}
        previous = {c.get("id"): c.get("target_pct") for c in prev_model.get("categories", []) if c.get("id") in BUCKETS}
    targets = smooth_targets(raw_targets, previous) if not no_smooth else raw_targets

    btc_prices = [d.get("btc_close") for d in crypto_ts.get("data", []) if d.get("btc_close")]
    gold_prices = [d.get("xau_usd") for d in gold_ts.get("data", []) if d.get("xau_usd")]
    crypto_vol = annualized_vol(btc_prices, 65.0)
    gold_vol = annualized_vol(gold_prices, 15.0)
    stocks_vol = round(clamp(16.0 * float(equity_beta), 16.0, 32.0), 1)

    expected = {
        "stablecoin": round(clamp(stable_apr, 3.0, 8.0), 1),
        "funds": round(clamp(risk_free - 0.4, 2.0, 5.0), 1),
        "gold": round(clamp(4.0 + (signal_scores["gold"] - 50) / 25, 3.0, 7.0), 1),
        "stocks": round(clamp(5.0 + (portfolio_health / 5) * 5 + (regime_score - 50) / 25, 5.0, 11.0), 1),
        "crypto": round(clamp(8.0 + signal_scores["crypto"] / 8, 8.0, 18.0), 1),
    }
    vols = {"stablecoin": 1.0, "funds": 3.0, "gold": gold_vol, "stocks": stocks_vol, "crypto": crypto_vol}
    current = current_allocation()

    rationale = {
        "stablecoin": (f"APR {stable_apr:.1f}% and regime {regime} keep liquidity floor high.", f"稳定币 APR {stable_apr:.1f}%，当前 {regime} 环境下维持流动性底座。"),
        "funds": (f"SOFR {risk_free:.2f}% supports conservative cash/fund carry.", f"SOFR {risk_free:.2f}%，保守现金/基金仍有持有收益。"),
        "gold": (f"Gold signal {gold_signal}; fair-value premium level {gold_premium_level} caps target.", f"黄金信号 {gold_signal}；公允价溢价 {gold_premium_level}，限制目标仓位上行。"),
        "stocks": (f"Portfolio health {portfolio_health:.1f}/5.0, equity beta {equity_beta:.2f}, regime score {regime_score}.", f"组合健康度 {portfolio_health:.1f}/5.0，股票 beta {equity_beta:.2f}，宏观分数 {regime_score}。"),
        "crypto": (f"Crypto composite {float(crypto_composite):.1f}, fear/greed {fgi}; capped at 15%.", f"Crypto composite {float(crypto_composite):.1f}，恐惧贪婪 {fgi}；上限 15%。"),
    }

    categories = []
    for k in BUCKETS:
        drift = round((current.get(k, 0) or 0) - targets[k], 1) if current else None
        action = "hold"
        if drift is not None:
            if drift < -2:
                action = "add"
            elif drift > 2:
                action = "trim"
        en, zh = rationale[k]
        categories.append({
            "id": k,
            "target_pct": targets[k],
            "raw_target_pct": raw_targets[k],
            "current_pct": current.get(k),
            "drift_pp": drift,
            "signal_score": round(signal_scores[k], 1),
            "expected_return_pct": expected[k],
            "annual_volatility_pct": round(vols[k], 1),
            "action": action,
            "rationale_en": en,
            "rationale_zh": zh,
        })

    return {
        "_meta": {
            "schema": "portfolio-allocation-model/v1",
            "version": "0.1.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "smoothing": None if no_smooth else {"alpha": SMOOTHING_ALPHA, "max_daily_move_pp": MAX_DAILY_MOVE_PP},
            "source_files": {
                "market": str(latest_market_file()) if latest_market_file() else None,
                "sentiment": str(MARKET / "sentiment-latest.json"),
                "health_indicators": str(MARKET / "health-indicators-latest.json"),
                "quant_ratings": str(MARKET / "quant-ratings.json"),
                "portfolio_beta": str(MARKET / "portfolio-beta.json"),
                "crypto_timeseries": str(DATA / "crypto-timeseries.json"),
                "gold_tracker": str(DATA / "gold-tracker.json"),
            },
        },
        "regime": {"name": regime, "score": regime_score},
        "risk_free_rate_pct": risk_free,
        "categories": categories,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--no-smooth", action="store_true", help="disable previous-target smoothing for tests/backtests")
    args = parser.parse_args()
    output = Path(args.output)
    model = build_model(no_smooth=args.no_smooth, output_path=output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(model, ensure_ascii=False, indent=2) + "\n")
    print(f"✅ portfolio model: {model['regime']['name']} score={model['regime']['score']} -> {output}")


if __name__ == "__main__":
    main()
