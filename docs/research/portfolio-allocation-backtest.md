# Portfolio Allocation Model Backtest

## Verdict
Status: **insufficient_data**
Decision: **Do not promote yet. Keep it as an explanation / dashboard layer until real equity/fund history and at least 180 replay days are wired.**

- Only 126 replay days; need at least 180 for a meaningful allocation verdict.
- Stocks return series is a weak proxy, not real equity portfolio history.
- Dynamic model improved risk and return metrics versus static baseline in this replay.

## Data Coverage
- Days: 126
- Start: 2025-12-02
- End: 2026-05-23
- Source: local-derived
- Stocks proxy quality: weak

## Strategy Comparison
- Static final value: 1.007576 | Dynamic final value: 1.016544
- Static Sharpe: 0.005 | Dynamic Sharpe: 0.198
- Static max drawdown: -7.75% | Dynamic max drawdown: -6.9%

## Risk/Return Metrics
- Dynamic CAGR: 4.87%
- Dynamic volatility: 13.18%
- Dynamic turnover: 11.21%

## Drawdown Review
Dynamic allocation is only promoted if it lowers or matches drawdown while maintaining return quality.

## Turnover Review
Dynamic rebalance count: 3

## Regime Behavior
Target history is saved in JSON for inspection; stress snapshots should cut stocks/crypto and raise liquidity.

## Failure Modes
- Short local history can overfit recent conditions.
- Weak stock proxy prevents a production-grade verdict.
- Rule-based targets may reduce risk but miss sharp rebounds.

## Next Model Changes
- Wire real equity/fund historical returns.
- Add transaction cost assumptions.
- Compare monthly vs drift-triggered rebalance modes.
