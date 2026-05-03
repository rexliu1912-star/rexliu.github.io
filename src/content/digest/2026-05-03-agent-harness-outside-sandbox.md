---
title: "The Agent Harness Belongs Outside the Sandbox"
title_zh: "Agent 的控制循环不该跑在沙箱里"
date: 2026-05-03
source: "https://www.mendral.com/blog/agent-harness-belongs-outside-sandbox"
source_name: "Mendral"
tags: ["ai-agents", "architecture", "security"]
summary: "Where the agent loop runs — inside or outside the sandbox — determines everything about security, multi-user scaling, and durability. Mendral's production choice: outside."
summary_zh: "Agent 控制循环跑在沙箱里还是外面，决定了整个系统的安全模型、多用户扩展能力和会话持久性。Mendral 的生产选择：放外面。"
---

<!-- en -->

## The Setup

Every production AI agent has a harness — the loop that sends prompts, receives responses, executes tool calls, and repeats until done. The question isn't whether you need one, but where it lives.

There are two answers, and they have fundamentally different security properties, failure modes, and scaling characteristics. If you're building for one engineer on a laptop, the tradeoffs tip one way. If you're building for dozens of engineers sharing the same agent, they tip the other. Mendral is in the multi-user camp, which surfaces problems single-user builders never see.

## Key Takeaways

- **Inside the sandbox** means your credentials live alongside the code the agent is modifying. Simple to build, works out of the box with Claude Code — but the sandbox *is* your session, and losing it loses everything.

- **Outside the sandbox** means credentials stay on your backend. The loop calls into the sandbox only when it needs to run a command. Sandboxes become disposable cattle, suspended in 25ms when idle and respawned if they die mid-session.

- **Multi-user breaks the filesystem model.** When dozens of engineers share skills and memories, a local `.claude/memory/MEMORY.md` stops working. Mendral's answer: virtualize the filesystem — one `read`/`write`/`edit` interface, two backends (sandbox for workspace, Postgres for memories and skills).

- **Tool proliferation makes agents worse.** Adding separate `memory_read` and `memory_write` tools dilutes the model's attention. Worse, frontier models are RL-trained on the Claude Code API surface — deviating from it puts you off the trained path.

## Why It Matters

Rex is building exactly this kind of system. The architecture decision Mendral is making — harness outside, sandbox as cattle, virtualized filesystem — maps directly onto the choices a multi-agent platform like Hermes faces. Their insight about keeping the tool surface identical to what models were trained on is especially sharp: every new tool you add is a tax on model performance.

The hardest unsolved problem they call out: consistency when two sessions in the same org are writing to the same memory concurrently. Last-writer-wins per key works for now, but they know it'll break. If you're designing an agent memory system today, this is the edge case to think about before it thinks about you.

**What to watch:** How Mendral handles the gap between Claude Code's evolving conventions and their virtualization layer. Bash as a leak — the agent can bypass virtualized paths with raw shell commands — is an unsolved problem they're patching with system prompts and tree-sitter parsing.

<!-- zh -->

## 背景

每个生产环境的 AI agent 都有一个控制循环（harness）：发 prompt、收回复、执行工具调用、循环直到完成。问题不在于你需要它，而在于它跑在哪里。

两个答案对应的安全属性、故障模式和扩展能力完全不同。单人用笔记本跑 agent 是一回事，几十个工程师共享同一个 agent 是另一回事。Mendral 做的是后者，所以碰到的很多问题单人使用者根本不会遇到。

## 关键要点

- **循环跑在沙箱里**：你的凭证和 agent 正在修改的代码放在一起。简单、能直接用 Claude Code——但沙箱就是你的 session，沙箱死了 session 就没了。

- **循环跑在沙箱外**：凭证留在后端。循环只在需要执行命令时才调用沙箱。沙箱变成可随时丢弃的"牛"，空闲时 25ms 挂起，中途挂掉就重新拉起一个。

- **多用户场景下文件系统模型失效。** 当几十个工程师共享 skills 和 memory 时，本地的 `.claude/memory/MEMORY.md` 就行不通了。Mendral 的方案：虚拟化文件系统——一套 `read`/`write`/`edit` 接口，两个后端（workspace 走沙箱，memory/skills 走 Postgres）。

- **工具越多 agent 越蠢。** 单独加 `memory_read`、`memory_write` 工具会稀释模型的注意力。更关键的是，前沿模型是用 Claude Code 的工具接口做 RL 训练的——你偏离这个接口，就等于离开了训练分布。

## 为什么重要

Rex 正在构建的就是这类系统。Mendral 做的架构选择——控制循环在外面、沙箱当牛用、文件系统虚拟化——直接映射到 Hermes 这类多 agent 平台面临的决策。他们关于"保持工具接口和模型训练时一致"的洞察尤其锋利：每加一个新工具，就是对模型性能多收一笔税。

他们指出最难解决的开放问题：同一个组织内两个 session 同时写 memory，一致性怎么办？目前用 per-key 的 last-writer-wins 凑合，但他们知道迟早会炸。如果你今天在设计 agent 记忆系统，这是需要提前想清楚的边界情况，别等它反过来找你。

**值得关注：** Mendral 如何处理 Claude Code 的文件布局变化与虚拟化层之间的裂缝。Bash 是个漏洞——agent 可以用原生 shell 命令绕过虚拟化路径——他们目前靠 system prompt + tree-sitter 解析来补，但这远不是终极方案。
