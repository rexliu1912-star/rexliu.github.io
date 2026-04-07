---
title: "How I Rebuilt My AI Stack After Losing Claude in OpenClaw"
description: "Anthropic cut off ties with OpenClaw, so I rebuilt my workflows around routing, subscriptions, and redundancy. The result: lower cost, less fragility, and a better system."
publishDate: "2026-04-07"
tags: ["AI", "Build in Public", "Tools", "Productivity"]
coverImage:
  src: "/images/posts/2026-04-07-losing-claude-on-openclaw-cover.png"
  alt: "A diversified AI workflow across multiple devices and model routes"
---

Anthropic cut off ties with OpenClaw and I had to rebuild my workflows fast.

I was running six agents on Opus and Sonnet. Multiple daily cron jobs. Every tweet, every research report, every morning briefing, all piped through Claude.

Monthly bill: $200 for Claude Max and $20 for GPT Plus.

I spent days learning new models and testing.

Monthly bill now: **$60** across multiple models.

---

## The one-vendor trap

Here is the honest part.

I did not choose Claude because I compared it carefully against everything else. I chose it because it felt best overall, then I kept stacking tasks on top of it.

Two months later I had 23 cron jobs all calling Opus.
Summarize news? Opus.
Format a weather report? Opus.
Answer "is the market open today?" Opus.

I was paying top-tier model prices to run glorified formatting work.

That is what happens when you build around "the best model."
You stop asking what each task actually needs.
Convenience compounds, then the bill compounds faster.

## The rebuild, in numbers

I tested each task against the models I could actually subscribe to. Not benchmarks, my real workflow.

| Role                         | Model             | Price    | What it does                               |
| ---------------------------- | ----------------- | -------- | ------------------------------------------ |
| **Main chat**                | MiniMax M2.7      | $10/mo   | Coordinator. Fast routing. Chinese-native. |
| **Writer / Research / Code** | GPT-5.4           | $20/mo   | Three agents, one model. Boring. Reliable. |
| **Light ops**                | GLM 5.1           | <$30/yr  | Cleanup, formatting, quick lookups.        |
| **Deep work (scheduled)**    | Claude Sonnet 4.6 | $20/mo   | Via Claude Desktop, not API.               |
| **Manual coding**            | Claude Code       | same $20 | MacBook only. Long sessions.               |

Total: **$60/month**.

One month of old spend now funds me for roughly a year.

## The surprise: routing saves more than any single model

I used to believe: use the best model and stop worrying about cost.

That advice is expensive and wrong.

Here is what routing looks like in my stack now:

```text
Task type                → Model
───────────────────────────────────
Chat coordination        → MiniMax (fast, cheap)
Tweet drafting           → GPT-5.4 (follows Voice DNA)
Market research          → GPT-5.4 (structured output)
Code review              → GPT-5.4 (syntax accuracy)
Weather / formatting     → GLM (costs almost nothing)
30-min deep analysis     → Claude Sonnet (via subscription)
Long coding session      → Claude Code (via subscription)
```

Every task is routed to the cheapest model that can do it correctly.
Not the smartest model, the cheapest **correct** one.

The savings do not come from downgrading one thing.
They come from matching everything.

## What to do if you are reading this and nervous

Here is the playbook, in order:

**1. Audit what your "best model" is actually doing.**  
Pull your logs. Sort by cost. Find the top 10 calls. Most of them will be routine formatting tasks. Those are candidates for a cheaper model tomorrow.

**2. Buy three subscriptions, not one API.**  
MiniMax ($10), GPT-5.4 ($20), Claude subscription ($20). Total under $60/month. This covers most of what a solo builder needs.

**3. Decouple your agent runtime from your model provider.**  
If your whole system dies when one vendor changes policy, you do not have a system. You have a rental agreement.

Build routing from day one, even if you start with one model.

**4. Stop confusing "best model" with "best workflow."**  
Cheap model + good rails beats expensive model + default prompt.

**5. Save Claude for the work only Claude can do.**  
Long-context reasoning. Nuanced writing you care about personally. Complex coding sessions. Pay for the subscription, use it there, route everything else away.

## The bigger picture

One model is a single point of failure.
One vendor is a single point of policy.

The stack I was running last Tuesday looked elegant on paper. In reality it was a Jenga tower with Anthropic holding the middle piece.
When they pulled it, everything fell.

What I have now is uglier.
Four models, three subscriptions, one agent framework.

But it is **diversified by design**.
No single vendor can kill it.
No single price change can double my bill.
No single "best model" announcement can force a rewrite.

This is the same principle I use in my crypto portfolio.
I do not know why it took a broken AI dependency to apply it to my tooling stack.

If you are building on one model, pause for a moment.

You are not just paying for intelligence.
You are also paying for fragility.

---

*Rex Liu, April 2026. Still building, still writing, still routing.*
