#!/usr/bin/env python3
"""Backtest the portfolio allocation model against a static baseline.

This is intentionally deterministic: tests can inject a fixture with returns and
snapshots, while production runs build a weak local replay from available local
series. The decision gate is conservative when data coverage is short or proxy
quality is weak.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT.parents[1] / "data"
MODEL_PATH = ROOT / "scripts" / "portfolio-allocation-model.py"
DEFAULT_OUTPUT = ROOT / "src" / "data" / "portfolio-allocation-backtest.json"
DEFAULT_REPORT = ROOT / "docs" / "research" / "portfolio-allocation-backtest.md"
BUCKETS = ["stablecoin", "funds", "gold", "stocks", "crypto"]
STATIC_WEIGHTS = {"stablecoin": 30.0, "funds": 30.0, "gold": 5.0, "stocks": 25.0, "crypto": 10.0}


def read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def pct_change(prev: float | None, curr: float | None) -> float | None:
    if prev in (None, 0) or curr is None:
        return None
    return (curr - prev) / prev


def normalize(weights: dict[str, float]) -> dict[str, float]:
    total = sum(float(weights.get(k, 0.0)) for k in BUCKETS)
    if not total:
        return dict(STATIC_WEIGHTS)
    return {k: float(weights.get(k, 0.0)) * 100.0 / total for k in BUCKETS}


def load_model_module():
    spec = importlib.util.spec_from_file_location("portfolio_allocation_model", MODEL_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load model module: {MODEL_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_local_series() -> dict[str, Any]:
    crypto = read_json(DATA / "crypto-timeseries.json", {})
    gold = read_json(DATA / "gold-timeseries.json", {})
    crypto_by_date = {r.get("date"): r for r in crypto.get("data", []) if isinstance(r, dict) and r.get("date")}
    gold_by_date = {r.get("date"): r for r in gold.get("data", []) if isinstance(r, dict) and r.get("date")}
    common = sorted(str(d) for d in (set(crypto_by_date) & set(gold_by_date)) if d)

    dates: list[str] = []
    returns = {k: [] for k in BUCKETS}
    previous_crypto = None
    previous_gold = None
    for date in common:
        btc = crypto_by_date[date].get("btc_close")
        xau = gold_by_date[date].get("xau_usd")
        c_ret = pct_change(previous_crypto, btc)
        g_ret = pct_change(previous_gold, xau)
        previous_crypto = btc if btc is not None else previous_crypto
        previous_gold = xau if xau is not None else previous_gold
        if c_ret is None or g_ret is None:
            continue
        dates.append(date)
        returns["stablecoin"].append(0.05 / 365.0)
        returns["funds"].append(0.03 / 365.0)
        returns["gold"].append(g_ret)
        returns["crypto"].append(c_ret)
        # No clean stock history exists locally yet. Use a conservative mixed proxy
        # and mark the report as weak/insufficient.
        returns["stocks"].append(max(min(0.45 * c_ret + 0.55 * g_ret, 0.05), -0.05))

    current_inputs = load_model_module().load_current_inputs()
    snapshots = []
    for date in dates:
        snap = dict(current_inputs)
        snap["date"] = date
        snapshots.append(snap)

    return {
        "dates": dates,
        "returns": returns,
        "snapshots": snapshots,
        "quality": {
            "source": "local-derived",
            "stocks_proxy_quality": "weak",
            "notes": ["Stocks use a weak gold/crypto mixed proxy until real equity history is wired."],
        },
    }


def validate_series(data: dict[str, Any]) -> None:
    dates = data.get("dates") or []
    returns = data.get("returns") or {}
    snapshots = data.get("snapshots") or []
    if not dates:
        raise ValueError("series has no dates")
    for k in BUCKETS:
        if len(returns.get(k, [])) != len(dates):
            raise ValueError(f"return length mismatch for {k}")
    if snapshots and len(snapshots) != len(dates):
        raise ValueError("snapshot length must match dates")


def max_drawdown(values: list[float]) -> float:
    peak = values[0]
    worst = 0.0
    for value in values:
        peak = max(peak, value)
        if peak:
            worst = min(worst, value / peak - 1.0)
    return worst


def metrics(values: list[float], daily_returns: list[float], risk_free_annual: float = 0.03) -> dict[str, float]:
    days = max(len(daily_returns), 1)
    final_value = values[-1]
    cagr = final_value ** (365.0 / days) - 1.0 if final_value > 0 else -1.0
    avg = sum(daily_returns) / days
    variance = sum((r - avg) ** 2 for r in daily_returns) / max(days - 1, 1)
    vol = math.sqrt(variance) * math.sqrt(365.0)
    sharpe = ((avg * 365.0) - risk_free_annual) / vol if vol > 0 else 0.0
    mdd = max_drawdown(values)
    calmar = cagr / abs(mdd) if mdd < 0 else 0.0
    return {
        "final_value": round(final_value, 6),
        "cagr_pct": round(cagr * 100, 2),
        "volatility_pct": round(vol * 100, 2),
        "max_drawdown_pct": round(mdd * 100, 2),
        "sharpe": round(sharpe, 3),
        "calmar": round(calmar, 3),
    }


def simulate(series: dict[str, Any], target_history: list[dict[str, Any]], mode: str) -> dict[str, Any]:
    dates = series["dates"]
    returns = series["returns"]
    values_by_bucket = {k: STATIC_WEIGHTS[k] / 100.0 for k in BUCKETS}
    values = [1.0]
    daily = []
    weights_history = []
    rebalance_events = []
    turnover = 0.0

    for i, date in enumerate(dates):
        before = sum(values_by_bucket.values())
        for k in BUCKETS:
            values_by_bucket[k] *= 1.0 + float(returns[k][i])
        total = sum(values_by_bucket.values())
        daily_ret = total / before - 1.0 if before else 0.0
        daily.append(daily_ret)
        target = normalize(target_history[i]["weights"] if target_history else STATIC_WEIGHTS)
        current_weights = {k: (values_by_bucket[k] / total) * 100.0 for k in BUCKETS}
        do_rebalance = False
        reason = ""
        if mode == "monthly" and (i == 0 or date[8:10] == "01"):
            do_rebalance = True
            reason = "monthly"
        elif mode == "drift_2pp" and any(abs(current_weights[k] - target[k]) > 2.0 for k in BUCKETS):
            do_rebalance = True
            reason = "drift_2pp"
        if do_rebalance:
            event_turnover = sum(abs(current_weights[k] - target[k]) for k in BUCKETS) / 200.0
            turnover += event_turnover
            values_by_bucket = {k: total * target[k] / 100.0 for k in BUCKETS}
            rebalance_events.append({"date": date, "reason": reason, "turnover_pct": round(event_turnover * 100, 2), "target": {k: round(target[k], 2) for k in BUCKETS}})
            current_weights = target
        values.append(total)
        weights_history.append({"date": date, "weights": {k: round(current_weights[k], 3) for k in BUCKETS}})

    result_metrics = metrics(values, daily)
    result_metrics["turnover_pct"] = round(turnover * 100, 2)
    result_metrics["rebalance_count"] = len(rebalance_events)
    return {
        "metrics": result_metrics,
        "values": [{"date": "start", "value": 1.0}] + [{"date": d, "value": round(v, 6)} for d, v in zip(dates, values[1:])],
        "weights_history": weights_history,
        "rebalance_events": rebalance_events,
        "target_history": target_history,
    }


def build_target_history(series: dict[str, Any]) -> list[dict[str, Any]]:
    model = load_model_module()
    history = []
    previous = None
    snapshots = series.get("snapshots") or []
    for i, date in enumerate(series["dates"]):
        inputs = snapshots[i] if i < len(snapshots) else model.load_current_inputs()
        built = model.build_model_from_inputs(inputs, no_smooth=False, previous=previous, source="backtest-snapshot")
        weights = {c["id"]: float(c["target_pct"]) for c in built["categories"]}
        raw = {c["id"]: float(c["raw_target_pct"]) for c in built["categories"]}
        previous = weights
        history.append({"date": date, "regime": built["regime"], "weights": weights, "raw_weights": raw})
    return history


def static_target_history(dates: list[str]) -> list[dict[str, Any]]:
    return [{"date": date, "regime": {"name": "static", "score": None}, "weights": dict(STATIC_WEIGHTS), "raw_weights": dict(STATIC_WEIGHTS)} for date in dates]


def decide(result: dict[str, Any], quality: dict[str, Any]) -> dict[str, Any]:
    dyn = result["strategies"]["dynamic"]["metrics"]
    stat = result["strategies"]["static"]["metrics"]
    days = result["data_coverage"]["days"]
    reasons = []
    if days < 180:
        reasons.append(f"Only {days} replay days; need at least 180 for a meaningful allocation verdict.")
    if quality.get("stocks_proxy_quality") == "weak":
        reasons.append("Stocks return series is a weak proxy, not real equity portfolio history.")
    improves_risk = dyn["max_drawdown_pct"] >= stat["max_drawdown_pct"] and dyn["volatility_pct"] <= stat["volatility_pct"]
    improves_return = dyn["final_value"] >= stat["final_value"] and dyn["sharpe"] >= stat["sharpe"]
    if improves_risk and improves_return:
        reasons.append("Dynamic model improved risk and return metrics versus static baseline in this replay.")
    else:
        reasons.append("Dynamic model has not yet cleared both risk and return gates versus static baseline.")
    if days >= 180 and quality.get("stocks_proxy_quality") != "weak" and improves_risk and improves_return:
        status = "controller_candidate"
    elif days < 60 or quality.get("stocks_proxy_quality") == "weak":
        status = "insufficient_data"
    else:
        status = "dashboard_only"
    return {"status": status, "reasons": reasons}


def write_report(path: Path, result: dict[str, Any]) -> None:
    stat = result["strategies"]["static"]["metrics"]
    dyn = result["strategies"]["dynamic"]["metrics"]
    decision = result["decision"]
    if decision["status"] == "controller_candidate":
        action = "Promote to controller candidate, but keep daily change limits and drift gates."
    elif decision["status"] == "insufficient_data":
        action = "Do not promote yet. Keep it as an explanation / dashboard layer until real equity/fund history and at least 180 replay days are wired."
    else:
        action = "Do not promote. Keep it dashboard-only unless a later version clears both risk and return gates."
    lines = [
        "# Portfolio Allocation Model Backtest",
        "",
        "## Verdict",
        f"Status: **{decision['status']}**",
        f"Decision: **{action}**",
        "",
        *[f"- {r}" for r in decision["reasons"]],
        "",
        "## Data Coverage",
        f"- Days: {result['data_coverage']['days']}",
        f"- Start: {result['data_coverage']['start']}",
        f"- End: {result['data_coverage']['end']}",
        f"- Source: {result['data_coverage'].get('source')}",
        f"- Stocks proxy quality: {result['data_coverage'].get('stocks_proxy_quality')}",
        "",
        "## Strategy Comparison",
        f"- Static final value: {stat['final_value']} | Dynamic final value: {dyn['final_value']}",
        f"- Static Sharpe: {stat['sharpe']} | Dynamic Sharpe: {dyn['sharpe']}",
        f"- Static max drawdown: {stat['max_drawdown_pct']}% | Dynamic max drawdown: {dyn['max_drawdown_pct']}%",
        "",
        "## Risk/Return Metrics",
        f"- Dynamic CAGR: {dyn['cagr_pct']}%",
        f"- Dynamic volatility: {dyn['volatility_pct']}%",
        f"- Dynamic turnover: {dyn['turnover_pct']}%",
        "",
        "## Drawdown Review",
        "Dynamic allocation is only promoted if it lowers or matches drawdown while maintaining return quality.",
        "",
        "## Turnover Review",
        f"Dynamic rebalance count: {dyn['rebalance_count']}",
        "",
        "## Regime Behavior",
        "Target history is saved in JSON for inspection; stress snapshots should cut stocks/crypto and raise liquidity.",
        "",
        "## Failure Modes",
        "- Short local history can overfit recent conditions.",
        "- Weak stock proxy prevents a production-grade verdict.",
        "- Rule-based targets may reduce risk but miss sharp rebounds.",
        "",
        "## Next Model Changes",
        "- Wire real equity/fund historical returns.",
        "- Add transaction cost assumptions.",
        "- Compare monthly vs drift-triggered rebalance modes.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def run_backtest(series: dict[str, Any]) -> dict[str, Any]:
    validate_series(series)
    dates = series["dates"]
    quality = series.get("quality") or {"source": "fixture", "stocks_proxy_quality": "fixture"}
    static_targets = static_target_history(dates)
    dynamic_targets = build_target_history(series)
    static = simulate(series, static_targets, mode="monthly")
    dynamic = simulate(series, dynamic_targets, mode="drift_2pp")
    result = {
        "_meta": {
            "schema": "portfolio-allocation-backtest/v1",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model_schema": "portfolio-allocation-model/v1",
        },
        "data_coverage": {
            "days": len(dates),
            "start": dates[0],
            "end": dates[-1],
            "source": quality.get("source", "fixture"),
            "stocks_proxy_quality": quality.get("stocks_proxy_quality", "fixture"),
            "notes": quality.get("notes", []),
        },
        "strategies": {"static": static, "dynamic": dynamic},
    }
    result["decision"] = decide(result, quality)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", help="optional fixture JSON with dates, returns, snapshots")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--report", default=str(DEFAULT_REPORT))
    args = parser.parse_args()

    series = read_json(Path(args.fixture), {}) if args.fixture else build_local_series()
    result = run_backtest(series)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_report(Path(args.report), result)
    print(f"✅ portfolio allocation backtest: {result['decision']['status']} -> {output}")


if __name__ == "__main__":
    main()
