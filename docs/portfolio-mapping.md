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

| 桶 ID | 中文 | 目标% | 包含的有知有行资产 |
|--------|------|-------|-------------------|
| `stablecoin` | 稳定币生息 | 35% | `stablecoin`（稳定生息） |
| `funds` | 基金与现金 | 20% | `liquid`, `yanerhigh`, `house`, `education`, `receivable` |
| `gold` | 黄金 | 5% | 从 `future`.breakdown["国泰黄金ETF_A"] 拆出 |
| `stocks` | 股票 | 25% | `qieman`, `future`(扣黄金), `rex_stock`, `us_stock` |
| `crypto` | 加密敞口 | 15% | `crypto`, `crypto_ivy` |

### 有知有行资产 ID 对照

| 有知有行 ID | 含义 | 归入桶 |
|-------------|------|--------|
| `stablecoin` | 稳定生息 | stablecoin |
| `yanerhigh` | 妍儿高端稳健 | funds |
| `liquid` | 流动资金 | funds |
| `house` | 妍妈买房基金 | funds |
| `education` | 福福教育基金 | funds |
| `receivable` | 应收款 | funds |
| `qieman` | 且慢组合 | stocks |
| `future` | 未来世代 | stocks (扣黄金后) |
| `rex_stock` | A股个股 | stocks |
| `us_stock` | 美股 | stocks |
| `crypto` | 加密永生(BTC/SNEK/ADA) | crypto |
| `crypto_ivy` | 加密交易 | crypto |
| `note` | 备注 | ❌ 不计入 |

### 黄金拆分逻辑

`future`（未来世代）内部包含国泰黄金ETF_A，需要拆出来：

1. **当前数据**：直接读 `future.breakdown["国泰黄金ETF_A"].amount`
2. **历史快照**：没有 breakdown 子结构，用当前比例估算
3. 拆出后：`stocks -= gold`, `gold = 拆出金额`

## 代码位置

| 文件 | 作用 |
|------|------|
| `scripts/build-portfolio-public.mjs` | 主构建脚本，包含 BUCKET_AGG、黄金拆分、current_pct 计算 |
| `src/data/portfolio-overrides.json` | target_pct（手写）、labels、colors（手写）|
| `src/data/portfolio-public.json` | 构建产物，提交到 git |
| `src/pages/portfolio.astro` | 前端页面 |

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
*最后更新: 2025-05-08*
