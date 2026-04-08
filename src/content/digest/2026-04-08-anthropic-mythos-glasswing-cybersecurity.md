---
title: "Anthropic's Project Glasswing: The Most Powerful AI Model You Can't Use"
title_zh: "Anthropic 的 Project Glasswing：你用不到的最强 AI 模型"
date: 2026-04-08
source: "https://www.anthropic.com/glasswing"
source_name: "Anthropic"
tags: ["ai", "cybersecurity", "anthropic", "agents", "safety"]
summary: "Anthropic built a model dramatically better than Opus 4.6 — then locked it behind a cybersecurity-only initiative with Cisco, AWS, Microsoft, and Google. The era of restricted-release AI has begun."
summary_zh: "Anthropic 造出了一个远超 Opus 4.6 的模型，然后把它锁在一个只有网络安全用途的联盟里。限制发布 AI 的时代开始了。"
---

<!-- en -->

## The Setup

Anthropic just dropped **Claude Mythos Preview** — and they're not letting anyone use it.

Instead of a standard launch, Anthropic announced **Project Glasswing**, a cybersecurity initiative that gives select partners (Cisco, AWS, Microsoft, Google, CrowdStrike, JPMorgan Chase, Palo Alto Networks, Linux Foundation) access to their most capable model ever — exclusively for finding and fixing security vulnerabilities.

This is a fundamental shift in how AI companies handle capability explosions. The model exists, it's dramatically better than anything before, but the public can't touch it.

## Key Takeaways

- **Mythos Preview crushes Opus 4.6 across the board**: SWE-bench Verified 93.9% vs 80.8%, CyberGym 83.1% vs 66.6%, GPQA Diamond 94.6% vs 91.3%. These aren't incremental gains.
- **It found real zero-days**: The model autonomously chained Linux kernel vulnerabilities to escalate from user to root access. All reported and patched.
- **$100M in credits committed**, plus $4M donated to open-source security foundations. Anthropic is putting real money behind this.
- **Not a general release**. Anthropic explicitly says they won't make Mythos generally available until they can build safeguards to block dangerous outputs — which they plan to test on a future Opus model first.
- **The offensive capabilities are the point**. As Palo Alto Networks noted: attackers will inevitably get similar capabilities. The race is to find and fix before that happens.

## Why It Matters

This is the first major "restricted release" of a frontier AI model — not because of regulation, but because the company itself decided the capabilities were too dangerous for unrestricted access.

For anyone building with AI agents (hi, that's us), this signals:
1. **Agent coding capabilities just jumped a generation** — Mythos-level agentic coding (93.9% SWE-bench) is coming to consumer models eventually
2. **Security is becoming the moat** — Anthropic is positioning safety infrastructure as a competitive advantage, not just a compliance checkbox
3. **The cybersecurity industry is about to get reshaped** — AI that can autonomously find zero-days changes the economics of both attack and defense

**What to watch:**
- When Mythos-class capabilities trickle down to consumer Claude models
- How competitors (OpenAI, Google) respond — do they also restrict, or race to ship?
- The 90-day public report Anthropic promised on vulnerabilities found

<!-- zh -->

## 背景

Anthropic 刚刚发布了 **Claude Mythos Preview** —— 然后不让任何人用。

他们没有按常规发布，而是宣布了 **Project Glasswing**，一个网络安全联盟。Cisco、AWS、微软、Google、CrowdStrike、摩根大通、Palo Alto Networks、Linux 基金会等伙伴获得了 Anthropic 有史以来最强模型的访问权 —— 但只能用来发现和修复安全漏洞。

这是 AI 公司处理能力跃迁的一个根本性转变。模型已经造出来了，它比之前任何模型都强得多，但公众碰不到。

## 关键要点

- **Mythos Preview 全面碾压 Opus 4.6**：SWE-bench Verified 93.9% 对 80.8%，CyberGym 83.1% 对 66.6%，GPQA Diamond 94.6% 对 91.3%。这不是渐进式进步。
- **它找到了真正的零日漏洞**：模型自主链式利用 Linux 内核漏洞，从普通用户权限提权到完全控制。所有漏洞已报告并修复。
- **Anthropic 承诺了 1 亿美元模型使用额度**，外加 400 万美元捐给开源安全基金会。真金白银地投入。
- **不是公开发布**。Anthropic 明确表示，在能构建阻止危险输出的安全防护之前，不会开放 Mythos —— 他们计划先在未来的 Opus 模型上测试这些防护。
- **攻击能力本身就是重点**。正如 Palo Alto Networks 所说：攻击者迟早会获得类似能力。竞赛的本质是抢在之前发现并修复。

## 为什么重要

这是前沿 AI 模型的第一次重大"限制发布" —— 不是因为监管要求，而是公司自己判断这些能力太危险，不适合无限制开放。

对于所有用 AI Agent 做开发的人来说，这释放了几个信号：
1. **Agent 编码能力刚跳了一代** —— Mythos 级别的自主编程（93.9% SWE-bench）迟早会下沉到消费级模型
2. **安全正在成为护城河** —— Anthropic 把安全基础设施定位为竞争优势，不只是合规勾选框
3. **网络安全行业即将被重塑** —— 能自主发现零日漏洞的 AI，改变了攻防双方的经济学

**值得关注：**
- Mythos 级能力何时下沉到消费级 Claude 模型
- 竞争对手（OpenAI、Google）如何回应 —— 也限制，还是抢着发布？
- Anthropic 承诺的 90 天后公开漏洞报告
