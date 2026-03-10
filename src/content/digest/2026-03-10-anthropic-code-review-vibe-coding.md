---
title: "Anthropic's Code Review: The Vibe Coding Cleanup Crew"
title_zh: "Anthropic 代码审查工具：Vibe Coding 的质检员来了"
date: 2026-03-10
source: "https://techcrunch.com/2026/03/09/anthropic-launches-code-review-tool-to-check-flood-of-ai-generated-code"
source_name: "TechCrunch"
tags: ["ai", "coding", "anthropic", "developer-tools"]
summary: "Claude Code's run-rate revenue hit $2.5B — but the code flood it created needs checking. Anthropic's answer: a multi-agent review system that catches logic bugs before they ship."
summary_zh: "Claude Code 年化收入突破 25 亿美元——但它制造的代码洪流需要质检。Anthropic 的解决方案：多代理审查系统，在代码上线前拦截逻辑错误。"
---

<!-- en -->

## The Setup

Vibe coding changed how fast we ship. It also changed how fast we break things. Anthropic just acknowledged both sides by launching Code Review — a tool built specifically to deal with the pull request tsunami that Claude Code created.

The numbers tell the story: Claude Code's run-rate revenue has crossed **$2.5 billion** since launch. Enterprise subscriptions quadrupled since January. More code than ever is being written, but now there's a bottleneck — who reviews all of it?

## How It Works

Code Review is a multi-agent system. Multiple agents examine a codebase from different angles simultaneously. A final aggregator ranks findings, removes duplicates, and surfaces what actually matters.

The key design decision: **logic errors only, not style**. Anthropic explicitly chose not to nag developers about formatting or naming conventions. Red flags for critical bugs, yellow for potential problems, purple for issues tied to preexisting code.

Each review costs **$15–25** depending on complexity. Premium pricing for a premium problem.

## Key Takeaways

- **Vibe coding created its own market.** The tool that generates the code now sells the tool that checks it. That's a powerful flywheel.
- **Enterprise is the real game.** Uber, Salesforce, Accenture are named customers. The product targets engineering leads who can flip it on for entire teams.
- **Multi-agent architecture for code review** is a design pattern worth watching. Parallel specialized agents + aggregator will show up in more domains.

## Why It Matters

If you're building with AI coding tools — and Rex does this daily with Claude Code agents — the review bottleneck is real. The ratio of code generated to code reviewed is increasingly lopsided. Anthropic is positioning itself as both accelerator and safety net.

The bigger signal: **AI companies are building vertically.** Generate code → review code → secure code (Claude Code Security). Each layer becomes a revenue stream. This is the enterprise AI playbook for 2026.

**What to watch:**
- Whether GitHub Copilot and Cursor respond with their own review layers
- Code Review pricing at scale — $15-25/review adds up fast for teams doing hundreds of PRs daily
- Anthropic's DOD lawsuit resolution — the enterprise push may be partly defensive as government contracts face uncertainty

<!-- zh -->

## 背景

Vibe coding 改变了我们发布代码的速度，也改变了我们制造问题的速度。Anthropic 刚刚正视了这个硬币的两面——推出 Code Review，专门应对 Claude Code 制造的 PR 海啸。

数字很直观：Claude Code 年化收入突破 **25 亿美元**。企业订阅从年初至今翻了四倍。代码产量前所未有，但瓶颈也来了——谁来审这些代码？

## 运作方式

Code Review 是一个多代理系统。多个 Agent 从不同角度同时审查代码库，最后一个聚合器负责排序、去重、只呈现真正重要的问题。

关键设计决策：**只看逻辑错误，不管代码风格**。Anthropic 刻意不去纠缠格式和命名规范。红色标记关键 Bug，黄色标记潜在问题，紫色标记与历史代码相关的隐患。

单次审查成本 **15–25 美元**，视复杂度而定。高端定价解决高端问题。

## 关键要点

- **Vibe coding 创造了自己的市场。** 生成代码的工具，现在又卖检查代码的工具。这是一个强力飞轮。
- **企业才是主战场。** Uber、Salesforce、Accenture 是公开客户。产品面向工程负责人，一键为整个团队开启。
- **多代理架构用于代码审查**——这个设计模式值得关注。并行专业化 Agent + 聚合器的范式会出现在更多领域。

## 为什么重要

如果你每天都在用 AI 编程工具——Rex 天天用 Claude Code 驱动 Agent 写代码——审查瓶颈是真实存在的。代码生成量和审查量之间的比例越来越失衡。Anthropic 正在把自己定位为加速器和安全网的双重角色。

更大的信号：**AI 公司在垂直整合。** 生成代码 → 审查代码 → 安全扫描（Claude Code Security），每一层都是收入来源。这就是 2026 年企业 AI 的打法。

**值得关注：**
- GitHub Copilot 和 Cursor 是否会跟进推出审查层
- 规模化成本——每次审查 15-25 美元，对每天数百个 PR 的团队来说费用不低
- Anthropic 的国防部诉讼走向——企业化加速可能部分是防御性策略，政府合同前景不确定
