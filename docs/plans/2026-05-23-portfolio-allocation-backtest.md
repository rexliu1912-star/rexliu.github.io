# Portfolio Allocation Model Backtest Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task if delegating. For direct implementation, follow strict TDD: write failing tests before production code.

**Goal:** Prove whether the dynamic portfolio allocation model improves Rex's real portfolio process by lowering risk, improving risk-adjusted returns, or creating a smoother upward equity curve versus the static allocation baseline.

**Architecture:** Build a deterministic backtest harness around the existing `scripts/portfolio-allocation-model.py` logic. The backtest must replay history day-by-day using only information available at or before each date, generate model target weights, simulate rebalancing, and compare dynamic allocation against a static benchmark. Results must be saved as machine-readable JSON plus a concise markdown report.

**Tech Stack:** Python 3.11 stdlib first, existing local JSON data under `/Users/samantha/clawd/data`, optional external market-data fetch only if local history is insufficient, Node tests for package/script integration where useful.

---

## Product Thesis

Rex is right: this model is only meaningful if allocation changes improve the portfolio path. The bar is not “the model moves numbers.” The bar is:

1. **Risk down:** lower max drawdown, lower realized volatility, or lower downside volatility.
2. **Return up or preserved:** higher CAGR, or similar CAGR with materially lower drawdown.
3. **Path quality up:** smoother compounding, fewer deep holes, fewer panic-risk periods.
4. **Market-aware:** allocation should respond sensibly to changing macro/risk regimes, not just add noise.
5. **Tradable:** turnover must be reasonable; any return improvement that comes from excessive churn is rejected.

If the model fails these tests, it stays as an explanatory dashboard layer, not a portfolio controller.

---

## Definitions

### Current Static Baseline

Use current v1 base allocation as the first benchmark:

```json
{
  "stablecoin": 30.0,
  "funds": 30.0,
  "gold": 5.0,
  "stocks": 25.0,
  "crypto": 10.0
}
```

### Dynamic Strategy

Use the existing model rules:

- Macro regime score.
- Per-bucket signal scores.
- Regime tilts.
- Signal tilts.
- Bounds.
- Smoothing.
- Max daily target move.

But for backtest it must be callable as a pure function:

```python
model_targets = compute_targets(snapshot, previous_targets=None, no_smooth=False)
```

No reads from “latest” files inside the pure function.

### Asset Proxies

Use daily return series for each bucket:

- `stablecoin`: daily carry from stablecoin APR, default 5% annualized.
- `funds`: daily carry from SOFR/risk-free proxy, default SOFR minus 40 bps if available.
- `gold`: gold ETF / XAU proxy from local `gold-timeseries.json`; fallback external ticker if needed.
- `stocks`: first-pass broad proxy QQQ/SPY or real portfolio weighted proxy if enough holding history exists.
- `crypto`: BTC proxy first; optionally blend BTC + SNEK if reliable SNEK history exists.

### Benchmarks

Minimum comparisons:

1. Static `30/30/5/25/10`.
2. Dynamic v1, daily target generation, monthly rebalance.
3. Dynamic v1, rebalance only when any bucket drift exceeds 2 percentage points.
4. Optional conservative baseline: `40/30/5/20/5`.

---

## Success Criteria

Dynamic model earns controller status only if it beats static baseline on at least one primary objective without failing guardrails.

### Primary Objectives

- Sharpe improves by at least `+0.10`, or
- Max drawdown improves by at least `15%` relative, with CAGR no worse than `-1.0pp`, or
- CAGR improves by at least `+1.0pp` with max drawdown not worse than `+5%` relative.

### Guardrails

Reject or downgrade if:

- Turnover > `150%` annualized unless risk improvement is exceptional.
- Dynamic underperforms static CAGR by more than `1.5pp` without major drawdown improvement.
- Dynamic increases max drawdown.
- Model repeatedly buys high-vol buckets into obvious stress without later recovery advantage.
- Results depend on future-looking data leakage.

---

## Data Audit Requirements

Before implementation, produce a local coverage table:

- Date range available for each source.
- Number of daily observations.
- Missing-data count.
- Which fields map to model inputs.
- Which bucket return proxies can be built locally.
- Whether external fetch is needed.

Expected local sources to inspect:

- `/Users/samantha/clawd/data/market/20??-??-??.json`
- `/Users/samantha/clawd/data/market/sentiment-latest.json`
- `/Users/samantha/clawd/data/market/portfolio-analytics-history.json`
- `/Users/samantha/clawd/data/market/portfolio-beta.json`
- `/Users/samantha/clawd/data/market/quant-ratings.json`
- `/Users/samantha/clawd/data/crypto-timeseries.json`
- `/Users/samantha/clawd/data/crypto-monitor-state.json`
- `/Users/samantha/clawd/data/gold-timeseries.json`
- `/Users/samantha/clawd/data/gold-tracker.json`
- `/Users/samantha/clawd/projects/the-workshop/data/portfolio.json`

If local history is less than 6 months, build the harness anyway but label the first result as “sanity replay,” not “investment-grade backtest.”

---

## Output Artifacts

Create:

- `scripts/portfolio-allocation-backtest.py`
- `tests/portfolio-allocation-backtest.test.mjs`
- `src/data/portfolio-allocation-backtest.json`
- `docs/research/portfolio-allocation-backtest.md`

Optional later:

- `src/pages/portfolio-backtest.astro` only after the report is useful. Do not add UI first.

---

## Implementation Tasks

### Task 1: Audit historical data coverage

**Objective:** Determine whether local data supports a real backtest or only a short sanity replay.

**Files:**
- Create: `scripts/portfolio-backtest-data-audit.py`
- Output: `src/data/portfolio-backtest-data-audit.json`

**Step 1: Write failing test**

Create `tests/portfolio-backtest-data-audit.test.mjs` asserting:

- Audit script exists.
- Running it writes JSON to a temp output path.
- JSON contains `sources`, `coverage`, and `verdict`.
- Verdict is one of `investment_grade`, `short_sanity_replay`, `insufficient`.

**Step 2: Verify RED**

Run:

```bash
node tests/portfolio-backtest-data-audit.test.mjs
```

Expected: FAIL because script does not exist.

**Step 3: Implement audit script**

Implement minimal Python script that:

- Scans dated market files.
- Reads crypto and gold timeseries.
- Counts date coverage.
- Emits source coverage JSON.

**Step 4: Verify GREEN**

Run:

```bash
node tests/portfolio-backtest-data-audit.test.mjs
python3 scripts/portfolio-backtest-data-audit.py --output src/data/portfolio-backtest-data-audit.json
```

Expected: PASS and JSON written.

**Step 5: Commit**

```bash
git add scripts/portfolio-backtest-data-audit.py tests/portfolio-backtest-data-audit.test.mjs src/data/portfolio-backtest-data-audit.json
git commit -m "test: add portfolio backtest data audit"
```

---

### Task 2: Extract model logic into a pure callable function

**Objective:** Make the allocation model replayable for historical snapshots without reading latest files internally.

**Files:**
- Modify: `scripts/portfolio-allocation-model.py`
- Test: `tests/portfolio-allocation-model.test.mjs`

**Step 1: Write failing test**

Add assertions that the Python script supports:

```bash
python3 scripts/portfolio-allocation-model.py --snapshot-fixture <fixture> --output <tmp>
```

The fixture should include only one synthetic day of inputs. The output must contain five bucket targets summing to 100.

**Step 2: Verify RED**

Run:

```bash
node tests/portfolio-allocation-model.test.mjs
```

Expected: FAIL because `--snapshot-fixture` does not exist.

**Step 3: Refactor minimally**

Introduce pure helpers:

```python
def compute_allocation_targets(snapshot: dict[str, Any], previous: dict[str, float] | None = None, no_smooth: bool = False) -> dict[str, Any]:
    ...
```

Keep current CLI behavior unchanged.

**Step 4: Verify GREEN**

Run:

```bash
node tests/portfolio-allocation-model.test.mjs
python3 scripts/portfolio-allocation-model.py --output /tmp/portfolio-model-check.json
```

Expected: existing model output still valid.

**Step 5: Commit**

```bash
git add scripts/portfolio-allocation-model.py tests/portfolio-allocation-model.test.mjs
git commit -m "refactor: make portfolio allocation model replayable"
```

---

### Task 3: Build bucket return series

**Objective:** Convert historical local data into daily returns for stablecoin, funds, gold, stocks, and crypto.

**Files:**
- Create: `scripts/portfolio-backtest-series.py`
- Test: `tests/portfolio-allocation-backtest.test.mjs`

**Step 1: Write failing test**

Assert the series builder can output:

```json
{
  "dates": ["YYYY-MM-DD"],
  "returns": {
    "stablecoin": [0.0001],
    "funds": [0.0001],
    "gold": [0.001],
    "stocks": [0.002],
    "crypto": [-0.01]
  }
}
```

With equal-length arrays and no future dates.

**Step 2: Verify RED**

Run:

```bash
node tests/portfolio-allocation-backtest.test.mjs
```

Expected: FAIL because builder does not exist.

**Step 3: Implement minimal series builder**

Rules:

- Carry assets: annual yield / 365.
- Gold: percent change of gold price.
- Crypto: percent change of BTC price.
- Stocks: use portfolio analytics history if available; otherwise broad proxy from local market data. If unavailable, mark `stocks_proxy_quality: weak`.
- Align dates by intersection.

**Step 4: Verify GREEN**

Run:

```bash
node tests/portfolio-allocation-backtest.test.mjs
python3 scripts/portfolio-backtest-series.py --output /tmp/portfolio-series.json
```

Expected: PASS and non-empty series if data exists.

**Step 5: Commit**

```bash
git add scripts/portfolio-backtest-series.py tests/portfolio-allocation-backtest.test.mjs
git commit -m "feat: build portfolio backtest return series"
```

---

### Task 4: Implement static baseline simulator

**Objective:** Establish the benchmark the dynamic model must beat.

**Files:**
- Create/Modify: `scripts/portfolio-allocation-backtest.py`
- Test: `tests/portfolio-allocation-backtest.test.mjs`

**Step 1: Write failing test**

Given a synthetic 3-day return series and fixed weights, assert:

- Portfolio values compound correctly.
- Weights sum to 100.
- Metrics include CAGR, volatility, max_drawdown, Sharpe, turnover.

**Step 2: Verify RED**

Run:

```bash
node tests/portfolio-allocation-backtest.test.mjs
```

Expected: FAIL because simulator does not exist.

**Step 3: Implement static simulation**

Implement:

```python
def simulate_static(series, weights, initial_value=1.0):
    ...
```

**Step 4: Verify GREEN**

Run:

```bash
node tests/portfolio-allocation-backtest.test.mjs
```

Expected: PASS for static simulator tests.

**Step 5: Commit**

```bash
git add scripts/portfolio-allocation-backtest.py tests/portfolio-allocation-backtest.test.mjs
git commit -m "feat: add static portfolio backtest baseline"
```

---

### Task 5: Implement dynamic model simulator

**Objective:** Replay the model day-by-day and compare dynamic allocation against static baseline.

**Files:**
- Modify: `scripts/portfolio-allocation-backtest.py`
- Test: `tests/portfolio-allocation-backtest.test.mjs`

**Step 1: Write failing test**

Given synthetic snapshots where risk regime worsens, assert dynamic target reduces stocks/crypto and increases stablecoin/funds versus base.

**Step 2: Verify RED**

Run:

```bash
node tests/portfolio-allocation-backtest.test.mjs
```

Expected: FAIL until dynamic simulator is wired.

**Step 3: Implement dynamic simulation**

Implement two rebalance modes:

- `monthly`
- `drift_2pp`

Track:

- Daily target weights.
- Actual weights after returns.
- Rebalance events.
- Turnover.
- Portfolio value.

**Step 4: Verify GREEN**

Run:

```bash
node tests/portfolio-allocation-backtest.test.mjs
python3 scripts/portfolio-allocation-backtest.py --output src/data/portfolio-allocation-backtest.json
```

Expected: PASS and JSON report generated.

**Step 5: Commit**

```bash
git add scripts/portfolio-allocation-backtest.py tests/portfolio-allocation-backtest.test.mjs src/data/portfolio-allocation-backtest.json
git commit -m "feat: backtest dynamic portfolio allocation model"
```

---

### Task 6: Add evaluation gate and markdown report

**Objective:** Turn raw backtest metrics into a decision: controller, dashboard-only, or needs more data.

**Files:**
- Modify: `scripts/portfolio-allocation-backtest.py`
- Create: `docs/research/portfolio-allocation-backtest.md`
- Test: `tests/portfolio-allocation-backtest.test.mjs`

**Step 1: Write failing test**

Assert backtest JSON includes:

```json
{
  "decision": {
    "status": "controller_candidate|dashboard_only|insufficient_data",
    "reasons": []
  },
  "strategies": {}
}
```

**Step 2: Verify RED**

Run:

```bash
node tests/portfolio-allocation-backtest.test.mjs
```

Expected: FAIL because decision gate missing.

**Step 3: Implement decision gate**

Use success criteria from this plan.

**Step 4: Generate markdown report**

Report structure:

```markdown
# Portfolio Allocation Model Backtest

## Verdict
## Data Coverage
## Strategy Comparison
## Risk/Return Metrics
## Drawdown Review
## Turnover Review
## Regime Behavior
## Failure Modes
## Next Model Changes
```

**Step 5: Verify GREEN**

Run:

```bash
node tests/portfolio-allocation-backtest.test.mjs
python3 scripts/portfolio-allocation-backtest.py --output src/data/portfolio-allocation-backtest.json --report docs/research/portfolio-allocation-backtest.md
git diff --check
```

Expected: PASS.

**Step 6: Commit**

```bash
git add scripts/portfolio-allocation-backtest.py tests/portfolio-allocation-backtest.test.mjs src/data/portfolio-allocation-backtest.json docs/research/portfolio-allocation-backtest.md
git commit -m "docs: evaluate portfolio allocation backtest"
```

---

### Task 7: Decide promotion path

**Objective:** Decide what the model is allowed to do after first backtest.

**Files:**
- Modify if needed: `docs/research/portfolio-allocation-backtest.md`
- Optional modify: `src/pages/portfolio.astro`

**Decision Matrix:**

- If `controller_candidate`: keep dynamic targets active, add backtest summary to internal docs, consider exposing a compact “Backtested since YYYY-MM-DD” note later.
- If `dashboard_only`: keep model rationale visible but make UI language less action-oriented; do not treat add/trim/hold as portfolio instruction.
- If `insufficient_data`: keep current v1 running, but label backtest as sanity replay and schedule data accumulation.

**Verification:**

Run:

```bash
git diff --check
npx astro check
pnpm build
```

Only push if site files changed and validation passes.

---

## Non-Negotiables

- No future leakage.
- No hand-wavy “looks better.” Metrics decide.
- No UI before research output.
- No extra cron. Backtest is manual or part of research workflow until useful.
- No controller promotion unless it beats static baseline under stated guardrails.

---

## First Execution Order

1. Run data audit.
2. If coverage is short, still build harness but mark result as sanity replay.
3. Refactor model to pure function with tests.
4. Build return series.
5. Simulate static baseline.
6. Simulate dynamic strategies.
7. Generate decision report.
8. Only then tune parameters.

Tuning before backtest is curve-fitting in the dark. Do not do it.
