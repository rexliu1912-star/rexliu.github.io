---
title: "My Self-Sovereign / Local / Private / Secure LLM Setup"
title_zh: "我的主权 AI：本地、私密、安全的 LLM 配置"
date: 2026-04-03
source: "https://vitalik.ca/general/2026/04/02/secure_llms.html"
source_name: "Vitalik Buterin"
tags: ["ai", "privacy", "security", "crypto", "local-llm"]
summary: "Vitalik details his fully local, sandboxed LLM setup — a principled counterproposal to cloud AI's security and privacy failures, including specific hardware, software, and agent containment techniques."
summary_zh: "Vitalik 分享了他的全本地 AI 配置：从硬件选型、沙盒隔离到 Agent 权限控制，是对云端 AI 隐私安全问题的一份原则性回答。"
---

<!-- en -->

## The Setup

We are living through the agent transition: AI has moved from "chatbot answers your question" to "agent takes a task and uses hundreds of tools to complete it." OpenClaw has been central to this shift. But Vitalik's read of the security culture around this space is damning — roughly 15% of skills contain malicious instructions, agents can modify their own system prompts without confirmation, and a single malicious webpage can trigger arbitrary code execution.

His response is principled: build a setup where **privacy, security, and self-sovereignty are non-negotiable from day one.**

## Key Takeaways

- **All inference runs locally.** Vitalik uses Qwen3.5:35B on either an NVIDIA 5090 laptop (90 tok/sec) or AMD Ryzen AI Max Pro with 128GB unified memory (51 tok/sec). The DGX Spark — despite NVIDIA's marketing — underperforms both. His floor: anything below 50 tok/sec is too annoying for daily use.

- **llama-server, not Ollama.** It can fit larger models in GPU memory (Ollama couldn't run Qwen3.5:35B on his hardware), and exposes a local HTTP endpoint any OpenAI-compatible client can point to — including Claude Code.

- **Sandboxing is mandatory.** He uses `bubblewrap` to create filesystem sandboxes rooted in specific directories. Agents inside can only see whitelisted files and ports. This is the structural defense against prompt injection attacks from malicious web content.

- **Agent permissions are explicit.** His custom messaging daemon only allows the LLM to send messages to *himself* freely; sending to *others* requires human confirmation. No wallet moves without sign-off.

- **Local world knowledge reduces internet exposure.** A 1TB Wikipedia dump plus local manuals means fewer search queries leaking to external services. He wants someone to build a Tor-wrapped search skill for the remaining queries.

- **Small models still fail on hard tasks.** Qwen3.5:35B one-shots simple apps and games, but struggles with domain-specific cryptographic implementations. His honest concession: he still routes hard problems to Claude.

## Why It Matters

The mainstream framing around AI agents treats privacy as optional and security as someone else's problem. Vitalik is arguing the opposite: **as agents gain real-world capabilities — crypto transactions, messaging, file access — the cost of complacency becomes catastrophic.** The self-sovereign stack he describes isn't paranoia. It's the natural consequence of taking seriously what these tools can actually do.

For anyone running AI agents with access to financial assets or private communications, this is a direct challenge: have you designed for containment, or are you trusting the ecosystem to not be malicious?

**What to watch:**
- Local LLM performance curves (AMD vs. NVIDIA convergence matters for non-CUDA users)
- OpenClaw and similar agents adding mandatory human confirmation layers for high-risk actions
- Whether the "Tor-wrapped search skill" Vitalik flags as missing gets built
- Regulatory/institutional pressure on cloud AI providers around data retention

<!-- zh -->

## 背景

AI 已经完成了一次关键跃迁：从"问答机器人"变成了"给任务、自己完成"的 Agent。OpenClaw 是这次转变的核心推手。但 Vitalik 对周边安全文化的判断很直接：约 15% 的 Skills 包含恶意指令，Agent 可以不经确认修改自己的系统提示，一个恶意网页就能触发任意代码执行。

他的应对是原则性的：**从第一天起就把隐私、安全、自主权设为不可妥协的底线。**

## 关键要点

- **推理全本地化。** 使用 Qwen3.5:35B，跑在 NVIDIA 5090 笔记本（90 tok/秒）或 AMD Ryzen AI Max Pro 128GB 统一内存（51 tok/秒）上。DGX Spark 尽管是"桌面 AI 超算"，实际性能不如好笔记本。他的底线：低于 50 tok/秒太慢，不值得用。

- **用 llama-server，不用 Ollama。** 前者能把更大模型装进 GPU 显存，并暴露本地 HTTP 接口，任何 OpenAI 兼容客户端都能接——包括 Claude Code。

- **沙盒是强制的。** 用 `bubblewrap` 创建文件系统沙盒，Agent 只能看到白名单里的文件和端口。这是对抗提示注入攻击的结构性防御。

- **Agent 权限必须显式。** 他自己写了一个消息 daemon：LLM 可以自由给自己发消息，但给别人发消息必须人工确认。没有任何链上操作能在没有 sign-off 的情况下执行。

- **本地知识库减少对外暴露。** 1TB 维基百科 dump + 本地文档，意味着更少的搜索查询泄漏给外部服务。他希望有人做一个 Tor 封装的搜索 skill。

- **小模型遇到硬任务还是会挂。** Qwen3.5:35B 能一击成功写简单应用和游戏，但遇到特定密码学实现就抖了。他坦承：难的问题还是发给 Claude。

## 为什么重要

主流 AI Agent 生态把隐私当可选项，把安全当别人的问题。Vitalik 的论点正好相反：**当 Agent 获得了真实的执行能力——加密交易、发消息、读写文件——放弃自主权的代价会是灾难性的。** 他描述的这套配置不是偏执狂行为，而是对"这些工具到底能做什么"认真思考后的自然结论。

对于任何跑着能碰到资产或私人通讯的 AI Agent 的人来说，这是一个直接的挑战：你的系统是为隔离设计的，还是在赌生态不作恶？

**值得关注：**
- 本地 LLM 性能曲线（AMD vs. NVIDIA 的差距收敛节奏对非 CUDA 用户很重要）
- OpenClaw 等 Agent 框架是否会增加高危操作的强制确认层
- Vitalik 点名"缺失"的 Tor 封装搜索 skill 是否有人来做
- 云端 AI 数据留存的监管/机构压力走向
