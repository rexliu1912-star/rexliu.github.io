---
title: "Stripe Link Turns Agent Payments Into a Permission Layer"
title_zh: "Stripe Link 把 Agent 支付变成权限层"
date: 2026-05-01
source: "https://techcrunch.com/2026/04/30/stripe-link-digital-wallet-ai-agents-shopping/"
source_name: "TechCrunch"
tags: ["ai", "agents", "fintech", "payments", "crypto"]
summary: "Stripe's new Link wallet is less a consumer checkout feature than an early control plane for agent commerce: OAuth access, spend requests, one-time cards, spending controls, and future support for stablecoins and agentic tokens."
summary_zh: "Stripe 新版 Link 钱包表面是消费支付工具，本质更像 agent commerce 的早期控制层：OAuth 授权、消费请求、一次性卡、支出控制，以及未来的稳定币和 agentic token 支持。"
---

<!-- en -->

## The Setup

Stripe is turning Link into a wallet built for the AI agent era. The basic product still looks familiar: users can connect cards, bank accounts, crypto wallets, buy-now-pay-later services, billing details, shipping details, subscriptions, and spending views. But the important part is not another checkout wallet. It is that Link now gives autonomous agents a structured way to request and execute payments without receiving raw payment credentials.

The flow is deliberately permissioned. A user grants an agent access to Link through OAuth. The agent can then create a spend request with context and wait for user approval. On mobile or web, the user reviews the transaction before Stripe shares payment capability with the agent. Stripe says future controls will let users define spending limits or decide when agents can act without approval.

Under the hood, this runs on Stripe's new Issuing for agents. Instead of handing an agent a card number, Link can provide a one-time-use card or use a Shared Payment Token backed by cards and banks. Traditional payment methods work today; Stripe says support for agentic tokens, stablecoins, and other payment types is coming soon.

## Key Takeaways

- Agent commerce is moving from demo scripts into payment infrastructure. The bottleneck is no longer whether an agent can click through a checkout page, but whether it can be trusted with authority to spend.
- Stripe is positioning itself as the permission layer between users, merchants, and AI assistants. OAuth, spend requests, limits, virtual cards, and transaction visibility are the actual product.
- The wallet is also a developer primitive. Builders of agents and personal assistants can use Link instead of creating their own payment stack.
- Stablecoins are being kept on the roadmap, not outside the story. That matters because agent payments will likely need programmable settlement, global reach, and clear audit trails.
- The near-term model is not fully autonomous spending. It is human-approved execution first, then progressively delegated authority.

## Why It Matters

For Rex, this is one of those boring-looking fintech announcements that points at a much larger shift. Agents do not become economically useful just because they can browse, reason, or generate code. They become economically useful when they can transact under constraints: book the trip, buy the ticket, renew the subscription, pay the vendor, purchase the API credits, or move money inside a predefined policy box.

Stripe is trying to own that box. If agent commerce becomes real, the valuable layer may not be the assistant UI. It may be the authorization, risk, compliance, and settlement fabric that lets agents act without turning every wallet into a security nightmare. That is why this connects directly to crypto and stablecoins: programmable money is attractive, but only if paired with permissioning, limits, recovery, and auditability.

**What to watch:**

- Whether OpenClaw, ChatGPT, Gemini, and other assistant platforms integrate Link-like spend requests natively.
- How quickly Stripe ships stablecoin and agentic token support, and whether it treats them as settlement rails or user-facing wallet assets.
- Whether merchants expose agent-friendly checkout APIs instead of forcing agents through human web flows.
- Whether banks and card networks respond with their own delegated-spend controls before Stripe owns the default abstraction.

<!-- zh -->

## 背景

Stripe 正在把 Link 改造成一个面向 AI agent 时代的钱包。基础功能看起来并不陌生：用户可以绑定银行卡、银行账户、crypto 钱包、先买后付服务，也可以保存账单信息、收货地址，查看订阅和消费记录。但真正重要的不是“又一个结账钱包”，而是 Link 现在给 autonomous agent 提供了一套结构化方式：agent 可以发起支付请求、执行支付，但拿不到用户的原始支付凭证。

这个流程是刻意做成权限化的。用户先通过 OAuth 授权 agent 访问 Link。之后 agent 可以创建一笔带上下文的消费请求，并等待用户批准。用户会在手机或网页端收到通知，先审阅交易，再由 Stripe 把支付能力交给 agent。Stripe 还说，未来会加入更细的控制：用户可以设置支出上限，也可以决定哪些场景下 agent 能不经逐笔审批直接行动。

底层依赖的是 Stripe 新推出的 Issuing for agents。它不是把一张真实卡号交给 agent，而是通过 Link 提供一次性虚拟卡，或者使用由银行卡和银行账户支持的 Shared Payment Token。传统支付方式现在已经可用；Stripe 表示，agentic token、稳定币和其他支付类型会在之后支持。

## 关键要点

- Agent commerce 正在从演示脚本走向支付基础设施。瓶颈不再是 agent 能不能点完结账页面，而是用户能不能放心给它“花钱的权限”。
- Stripe 想成为用户、商户和 AI assistant 之间的权限层。OAuth、消费请求、额度限制、虚拟卡、交易可见性，才是真正的产品。
- 这个钱包同时也是开发者基础组件。做 agent 或个人助手的公司，可以直接接 Link，而不是从零搭自己的支付栈。
- 稳定币没有被排除在故事外，而是放进了路线图。这很关键，因为 agent 支付天然需要可编程结算、全球可达性和清晰审计轨迹。
- 近期模型不是完全自主花钱，而是先让人类批准执行，再逐步把权限委托出去。

## 为什么重要

对 Rex 来说，这类看起来很无聊的 fintech 发布，反而指向一个更大的变化。Agent 不是因为会浏览网页、会推理、会写代码就真的有经济价值。它必须能在约束下完成交易，才开始进入真实世界：订酒店、买票、续订订阅、支付供应商、购买 API credits，或者在预设策略范围内调动资金。

Stripe 想控制的就是这个“策略盒子”。如果 agent commerce 真的成立，最值钱的那层未必是 assistant UI，而是授权、风控、合规和结算网络：它让 agent 能行动，但又不会把每个钱包都变成安全灾难。这也是它和 crypto、stablecoin 直接相连的地方：可编程货币很诱人，但必须和权限、额度、恢复机制、审计能力一起出现，才可能被主流用户真正使用。

**值得关注：**

- OpenClaw、ChatGPT、Gemini 和其他 assistant 平台会不会原生接入类似 Link 的消费请求。
- Stripe 多快推出稳定币和 agentic token 支持，以及它会把它们当成结算轨道，还是用户可见的钱包资产。
- 商户是否开始提供 agent-friendly checkout API，而不是继续逼 agent 模拟人类网页操作。
- 银行和卡组织会不会在 Stripe 成为默认抽象层之前，推出自己的委托消费控制能力。
