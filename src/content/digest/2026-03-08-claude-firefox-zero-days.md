---
title: "Claude Found 22 Firefox Zero-Days in Two Weeks — and That Changes Everything"
title_zh: "Claude 两周找到 22 个 Firefox 零日漏洞——游戏规则变了"
date: 2026-03-08
source: "https://www.anthropic.com/news/mozilla-firefox-security"
source_name: "Anthropic"
tags: ["ai", "security", "agents"]
summary: "Anthropic's Claude Opus 4.6 found 22 vulnerabilities in Firefox — 14 high-severity — in just two weeks, outpacing all human researchers in any single month of 2025."
summary_zh: "Anthropic 的 Claude Opus 4.6 在两周内发现 Firefox 22 个漏洞（14 个高危），超过 2025 年任何单月的人工发现总数。"
---

<!-- en -->

## The Setup

Anthropic partnered with Mozilla to stress-test Firefox — one of the most well-tested open-source projects in the world. They pointed Claude Opus 4.6 at the codebase for two weeks. The result: **22 vulnerabilities discovered**, 14 classified as high-severity. That's nearly a fifth of all high-severity Firefox bugs remediated in 2025 — found in 14 days.

The first Use After Free vulnerability was flagged within **twenty minutes** of exploration. By the time human researchers finished validating that first bug, Claude had already found fifty more unique crashing inputs.

## Key Takeaways

- **Finding is cheap, exploiting is hard.** Claude spent $4,000 in API credits trying to turn its discoveries into working exploits — and only succeeded twice, in a sandbox-disabled test environment. The asymmetry is massive: finding bugs costs pennies per vulnerability, exploiting them costs orders of magnitude more.

- **Task verifiers are the unlock.** Claude's best results came when it could check its own work with external tools — confirming bugs were real, patches actually fixed them, and nothing else broke. This "agent + verifier" pattern is becoming the standard architecture for AI-powered code work.

- **Scale is the story.** Claude scanned nearly 6,000 C++ files and submitted 112 unique reports. No human team operates at that throughput. And Mozilla's response — encouraging bulk submission without manual pre-validation — signals that maintainers are adapting to AI-speed workflows.

## Why It Matters

This isn't a benchmark result or a demo. It's a production collaboration with real CVEs fixed in Firefox 148, shipped to hundreds of millions of users.

For builders: the "agent + task verifier" pattern Anthropic describes is the same architecture that makes coding agents useful. The model proposes, the verifier validates, the agent iterates. If you're building AI tools, this is the loop to study.

For investors: AI security tooling is about to become a massive category. The asymmetry — cheap to find, expensive to exploit — is a net positive for defenders, but only if they adopt fast enough.

**What to watch:**
- Whether other frontier models (GPT-5.4, Gemini) replicate these results on comparable codebases
- Mozilla's internal adoption of Claude for ongoing security — first customer or proof-of-concept?
- The exploit gap closing as models improve — Anthropic flagged this as a concern worth monitoring

<!-- zh -->

## 背景

Anthropic 和 Mozilla 合作，用 Claude Opus 4.6 对 Firefox 做安全审计。Firefox 是全球测试最充分的开源项目之一，数亿用户每天在用。结果：**两周内发现 22 个漏洞**，14 个被评为高危。这个数字几乎相当于 2025 年全年高危漏洞修复量的五分之一。

第一个 Use After Free 漏洞在探索开始 **20 分钟后**就被发现了。等人类研究员验证完第一个漏洞时，Claude 已经找到了另外 50 个独立的崩溃输入。

## 关键要点

- **发现成本极低，利用成本极高。** Claude 花了 4000 美元 API 额度尝试将漏洞转化为可用的攻击——只成功了两次，还是在关闭沙箱的测试环境下。不对称性极大：发现漏洞的成本几乎可以忽略，利用漏洞的成本高出几个数量级。

- **任务验证器是关键。** Claude 表现最好的时候，是它能用外部工具自我检查——确认漏洞是真的、补丁确实修复了问题、没有引入新问题。这种「Agent + 验证器」的模式正在成为 AI 代码工作的标准架构。

- **规模才是核心叙事。** Claude 扫描了近 6000 个 C++ 文件，提交了 112 份独立报告。没有人类团队能达到这个吞吐量。Mozilla 的反应——鼓励批量提交，不要求逐个手动预验证——说明维护者正在适应 AI 速度的工作流。

## 为什么重要

这不是跑分，不是 Demo。这是和 Mozilla 的真实合作，发现的 CVE 已经在 Firefox 148 中修复，推送给了数亿用户。

对 Builder 来说：Anthropic 描述的「Agent + 任务验证器」模式，和让 coding agent 真正好用的架构完全一致。模型提出方案，验证器确认，Agent 迭代。如果你在做 AI 工具，这是值得研究的核心循环。

对投资者来说：AI 安全工具即将成为一个大赛道。发现便宜、利用昂贵的不对称性对防守方是利好——但前提是他们得跟上速度。

**值得关注：**
- 其他前沿模型（GPT-5.4、Gemini）能否在同等复杂度的代码库上复现这些结果
- Mozilla 内部是否持续采用 Claude 做安全审计——这是第一个客户还是概念验证？
- 随着模型进步，利用漏洞的门槛是否在降低——Anthropic 自己也在关注这个风险
