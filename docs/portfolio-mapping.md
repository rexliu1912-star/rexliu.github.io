# Portfolio 数据对照表

> 每次改 allocation 相关逻辑时，先查这个文件。

## 数据流

```
有知有行(App) ──手动──→ portfolio.json (private)
                              │
                              ▼
                    build-portfolio-public.mjs
                    ┌─────────────────────────┐
                    │ 1. 读 portfolio.json     │
                    │ 2. 读 portfolio-overrides │
                    │ 3. 计算 current_pct      │
                    │ 4. 生成 history           │
                    └──────────┬──────────────┘
                               ▼
                    portfolio-public.json (提交到 git)
                               │
                               ▼
                    portfolio.astro → rexliu.io/portfolio/
```

## 更新频率

| 组件 | 数据源 | 更新方式 | 频率 |
|------|--------|----------|------|
| Allocation 比例 | portfolio.json → build 计算 | `gold-daily-website-update` cron | 每天 07:20 |
| Allocation 漂移 | 同上 + overrides target | 同上 | 同上 |
| Allocation History | portfolio-history/*.json | build 时读取 | 每月有新快照时 |
| Crypto 监控 | crypto-monitor-state.json | `morning-prep` cron | 每天 06:55 |
| 黄金追踪 | gold-tracker.json | `gold-daily-website-update` | 每天 07:20 |
| 个股持仓 | Convex API | 前端实时查询 | 实时 |

## 有知有行 → Portfolio 桶映射

### 5 桶定义

| 桶 ID | 中文 | 英文 | 目标% | 颜色 |
|--------|------|------|-------|------|
| `stablecoin` | 稳定币生息 | Stablecoin Yield | 35% | `#10b981` |
| `funds` | 基金与现金 | Funds | 20% | `#3b82f6` |
| `gold` | 黄金 | Gold | 5% | `#eab308` |
| `stocks` | 股票 | Stocks | 25% | `#8953d1` |
| `crypto` | 加密敞口 | Crypto | 15% | `#f59e0b` |

### 有知有行资产 ID 对照（05-07 更新）

| 有知有行 ID | 有知有行名称 | 归属 | 归入桶 | 当前金额 |
|-------------|-------------|------|--------|---------|
| `stablecoin` | 稳定生息 | 我 | stablecoin | ¥4,164,700 |
| `yanerhigh` | 高端稳健 | 妍儿 | funds | ¥3,219,800 |
| `liquid` | 流动资金 | 妍儿+我 | funds | ¥781,200 |
| `house` | 买房基金 | 妍妈 | funds | ¥445,800 |
| `education` | 教育基金 | 福福 | funds | ¥26,100 |
| `receivable` | 应收款(借给他人的钱) | 我 | funds | ¥10,000 |
| `qieman` | 且慢组合 | 我 | stocks | ¥1,014,500 |
| `future` | 未来世代 | 我 | stocks (扣黄金后) | ¥610,200 |
| `rex_stock` | AH股掘金 | 我 | stocks | ¥674,600 |
| `us_stock` | 美股账户 | 我 | stocks | ¥37,300 |
| `crypto` | 加密永生 | 我 | crypto | ¥1,041,800 |
| `crypto_ivy` | 加密交易 | 妍儿 | crypto | ¥2,123 |
| `note` | 备注 | — | ❌ 不计入 | — |

### 未来世代 (future) 内部持仓

| 基金名称 | 金额 | 归入 |
|----------|------|------|
| 国泰黄金ETF_A | ¥422,454 | **gold** (拆出) |
| 其他ETF (天弘/华夏/摩根等) | ¥187,746 | stocks |
| **合计** | **¥610,200** | |

### 黄金拆分逻辑

`future`（未来世代）内部包含国泰黄金ETF_A，需要拆出来：

1. **当前数据**：直接读 `future.breakdown["国泰黄金ETF_A"].amount`
2. **历史快照**：没有 breakdown 子结构，用当前比例估算
3. 拆出后：`stocks -= gold_amount`, `gold = 拆出金额`

## 当前配置（05-07 计算）

| 桶 | 目标 | 实际 | 偏移 |
|----|------|------|------|
| 稳定币生息 | 35% | 34.6% | -0.4pp |
| 基金与现金 | 20% | 37.3% | +17.3pp |
| 黄金 | 5% | 3.5% | -1.5pp |
| 股票 | 25% | 16.0% | -9.0pp |
| 加密敞口 | 15% | 8.7% | -6.3pp |

**净资产**: ¥12,028,123（总资产 ¥12,028,123，负债 -¥13,900 未计入）

## 代码位置

| 文件 | 作用 |
|------|------|
| `scripts/build-portfolio-public.mjs` | 主构建脚本：BUCKET_AGG、黄金拆分、current_pct 计算 |
| `src/data/portfolio-overrides.json` | target_pct（手写）、labels、colors（手写） |
| `src/data/portfolio-public.json` | 构建产物，提交到 git |
| `src/pages/portfolio.astro` | 前端页面 |
| `docs/portfolio-mapping.md` | 本对照文档 |

## 手动维护项（仅 target_pct）

只需维护 `portfolio-overrides.json` 里的 `target_pct`，其他全部自动：

```json
{
  "allocation": {
    "categories": [
      { "id": "stablecoin", "target_pct": 35 },
      { "id": "funds",      "target_pct": 20 },
      { "id": "gold",       "target_pct": 5 },
      { "id": "stocks",     "target_pct": 25 },
      { "id": "crypto",     "target_pct": 15 }
    ]
  }
}
```

`current_pct` 和 `drift_pp` 由 build 脚本从 `portfolio.json` 实际数据自动计算。

## 数据源文件路径

| 文件 | 路径 |
|------|------|
| Private portfolio | `~/clawd/projects/the-workshop/data/portfolio.json` |
| 月度快照 | `~/clawd/projects/the-workshop/data/portfolio-history/YYYY-MM.json` |
| Overrides | `~/clawd/projects/rexliu-website/src/data/portfolio-overrides.json` |
| Crypto monitor | `~/clawd/output/crypto/crypto-monitor-state.json` |
| Gold tracker | `~/clawd/output/gold/gold-tracker.json` |

---
*最后更新: 2026-05-07 (有知有行截图同步)*
