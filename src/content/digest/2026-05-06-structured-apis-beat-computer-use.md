---
title: "Structured APIs Beat Computer Use by 45x"
title_zh: "结构化 API 比 Computer Use 便宜 45 倍"
date: 2026-05-06
source: "https://reflex.dev/blog/computer-use-is-45x-more-expensive-than-structured-apis/"
source_name: "Reflex"
tags: ["ai-agents", "computer-use", "api", "automation", "product"]
summary: "Reflex benchmarked the same admin task through browser-use vision control and auto-generated structured APIs: the UI path needed ~551k input tokens and ~17 minutes, while the API path used ~12k tokens and finished in ~20 seconds. For tools we control, the agent interface should be an API, not a screen."
summary_zh: "Reflex 用同一个后台任务对比 browser-use 视觉操作和自动生成的结构化 API：UI 路径消耗约 55.1 万 input tokens、耗时约 17 分钟；API 路径只用约 1.2 万 tokens、约 20 秒完成。对我们能控制的工具，Agent 的接口应该是 API，不是屏幕。"
---

<!-- en -->

## The Setup

Reflex ran a useful benchmark because it tests the thing agent builders keep hand-waving away: interface cost. The task was deliberately mundane but realistic — find a customer named Smith with the most orders, locate their latest pending order, accept all pending reviews, and mark the order delivered.

They compared two paths with the same model and same dataset. One path used `browser-use` in vision mode to operate an admin UI through screenshots and clicks. The other used structured HTTP endpoints auto-generated from the app's event handlers.

The result is not subtle. The vision path averaged **53 steps**, roughly **17 minutes**, and **550,976 input tokens**. The API path averaged **8 calls**, about **20 seconds**, and **12,151 input tokens** with Claude Sonnet. With Haiku, the API path finished in under **8 seconds**.

## Key Takeaways

- **Screens are expensive context.** A vision agent has to keep paying to see every intermediate state. Better models can reduce mistakes, but they do not remove the cost of looking.
- **UI automation hides engineering work.** The vision agent failed without a 14-step walkthrough because it missed reviews below the fold and did not paginate correctly. That walkthrough is still product work, just disguised as prompting.
- **APIs make state explicit.** Structured endpoints return the facts the agent needs: pagination, IDs, filtered records, and valid mutations. The agent spends tokens deciding, not inspecting pixels.
- **Variance matters.** Vision runs ranged from 749s to 1257s. API runs were almost deterministic. For production automation, predictability is not a nice-to-have; it is the product.

## Why It Matters

For Rex, the practical lesson is sharp: computer use is a fallback for tools we do not control. It should not be the default architecture for tools we build.

If an internal system expects agents to operate it, the product surface should expose actions directly: list, filter, inspect, mutate, confirm. A pretty dashboard helps humans; a typed action surface helps agents. The real product moat is not "can an agent click our UI" — it is whether the system gives agents the shortest safe path from intent to state change.

This also changes how to evaluate AI products. If a startup's agent demo relies on a browser crawling through forms, assume high cost and high variance until proven otherwise. If the system has structured tools, audit the schema quality, permissions, and observability instead.

**What to watch:**
- Whether agent platforms start shipping automatic action APIs beside every UI
- How teams permission and audit those generated endpoints
- Whether browser-use workflows remain mainly for third-party SaaS and legacy software
- Whether model vendors price vision-agent loops differently from structured tool calls

<!-- zh -->

## 背景

Reflex 这篇 benchmark 值得读，因为它测的不是模型能力，而是 Agent 系统里经常被忽略的东西：接口成本。任务很普通，但非常真实——在后台系统里找到订单最多的 Smith 客户，定位他最新的 pending 订单，接受所有 pending reviews，然后把订单标记为 delivered。

他们用同一个模型、同一份数据集，对比两条路径。一条是用 `browser-use` 的 vision mode，让 Agent 看截图、点按钮、操作后台 UI。另一条是调用从应用 event handlers 自动生成的结构化 HTTP endpoints。

结果非常直接。视觉路径平均需要 **53 步**、约 **17 分钟**、消耗 **550,976 input tokens**。API 路径平均只要 **8 次调用**、约 **20 秒**、消耗 **12,151 input tokens**。如果换成 Haiku 走 API，甚至不到 **8 秒**就能完成。

## 关键要点

- **屏幕是昂贵的上下文。** 视觉 Agent 每一步都要为“看见当前状态”付费。模型再强，也不能消除持续看图的成本。
- **UI 自动化把工程成本藏起来了。** 视觉 Agent 在没有 14 步 walkthrough 的情况下失败，因为它没翻页，也没看到 fold 下面的 reviews。这个 walkthrough 其实也是产品工程，只是伪装成 prompt。
- **API 会把状态显式化。** 结构化 endpoints 直接返回 Agent 需要的事实：分页、ID、过滤后的记录、可执行的 mutation。Agent 的 token 用来决策，而不是用来读像素。
- **方差本身就是风险。** 视觉路径耗时从 749 秒到 1257 秒不等；API 路径几乎是确定性的。生产级自动化里，可预测性不是锦上添花，而是产品本身。

## 为什么重要

对 Rex 来说，结论很锋利：computer use 是处理不可控工具的 fallback，不应该成为我们自己构建工具时的默认架构。

如果一个内部系统未来要给 Agent 使用，它的产品表面就应该直接暴露动作：list、filter、inspect、mutate、confirm。漂亮 dashboard 对人有用；类型清晰的 action surface 对 Agent 有用。真正的产品护城河不是“Agent 能不能点我们的 UI”，而是系统能不能给 Agent 一条最短、最安全的路径，从意图走到状态变化。

这也改变了我们评估 AI 产品的方式。如果一个 Agent demo 主要靠浏览器在表单里爬，先默认它成本高、方差大，直到它证明不是这样。如果系统有结构化 tools，就应该重点审 schema 质量、权限边界和可观测性。

**值得关注：**
- Agent 平台是否会开始给每个 UI 同步生成 action API
- 团队如何给这些自动生成的 endpoints 做权限与审计
- browser-use 是否会主要留给第三方 SaaS 和 legacy software
- 模型厂商是否会把视觉 Agent 循环和结构化 tool calls 分开定价
