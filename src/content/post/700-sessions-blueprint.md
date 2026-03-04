---
title: "700 Sessions Later: The Full Blueprint Behind My 6-Agent AI System"
description: "19 cron jobs. 6 specialized agents. One Mac Mini M4. What works, what broke, and the exact files you can copy into OpenClaw today."
publishDate: "2026-03-04"
tags: ["AI", "Crypto"]
---

19 cron jobs. 6 specialized agents. One Mac Mini M4.

In five weeks, this system went from a 209-line config disaster to producing daily content drafts, alpha research, portfolio tracking, and design — mostly while I sleep.

But it also fabricated financial reports, broke silently for 13 days, and hallucinated rules that didn't exist.

This is the full system. What works, what broke, and the exact files you can copy into OpenClaw today.

---

## The Stack

- **Hardware:** Mac Mini M4 16GB
- **Orchestration:** OpenClaw
- **Model:** Claude Opus 4.6 (creative/research), Claude Sonnet 4.6 (ops/analysis), GPT-5.3-Codex (Fallback), Nano Banana 2 (images)
- **Subscription:** Claude Max 20x ($200), ChatGPT Plus ($20), Google One ($20)
- **Channels:** Telegram (decisions) + Discord (operations, 9 channels)

## The Team

| Agent       | Role        | Channel             | One-liner                                         |
| ----------- | ----------- | ------------------- | ------------------------------------------------- |
| Samantha 🧡 | Coordinator | Telegram + #general | Routes tasks, daily briefings, team memory        |
| Loki 🐍     | Writer      | #content            | Tweets, long-form, EN/CN translation              |
| Vision 👁️  | Researcher  | #research           | Daily alpha radar, project scoring, signal filing |
| Jarvis ⚙️   | Coder       | #coding             | Tools, scripts, PRs only (never push direct)      |
| Shuri 🎨    | Designer    | #design             | Pixel art, brand visuals, taste rules compliance  |
| Friday 📊   | Analyst     | #data               | Portfolio, expenses, weekly metrics               |

Each agent gets spawned per task via `sessions_spawn`. No long-running sessions. One task, one contract, one deliverable.


---

## The 3 Files That Run Everything

### File 1: AGENTS.md (75 lines)

This used to be 209 lines. Personalities, philosophy, edge cases I'd never hit. Agents got confused and followed rules meant for other agents.

Now it's a routing table. Four sections:

```markdown
# AGENTS.md — Routing Directory (not a rulebook)

## Team Table
| Agent | Channel | Responsibility |
|-------|---------|---------------|
| Samantha | Telegram/#general | Coordinator, memory, briefings |
| Loki | #content | Content drafts, voice DNA, translation |
| Vision | #research | Alpha radar, project research, signals |
| Jarvis | #coding | Tools, scripts, PRs (never push direct) |
| Shuri | #design | Images, brand visuals, taste rules |
| Friday | #data | Portfolio, finance, weekly metrics |

## Workflow
1. Rex requests → Samantha routes to agent
2. Agent reads relevant rules (not all rules)
3. Agent executes with completion contract
4. Output → file + review + deliver

## Rules Routing
- Spawning agents → read data/agents/rules/completion-contract.md
- Content tasks → read skills/rex-ink/voice-dna/
- Design tasks → read design-system/taste-rules.md
- Finance tasks → read data/agents/rules/finance-rules.md

## Non-Negotiables
- Output goes to files, not just chat
- Create PRs, never push direct
- No fabricated data — if unsure, say so
- One task, one contract, one session
```

**The principle:** agents read only the rules their current task needs. No agent reads everything. Less context = better output.

### File 2: Completion Contract (per task)

This was my biggest unlock. Agents don't know when they're done. They know when they've generated enough tokens to feel done. Different things.

Every task ships with explicit conditions:

```markdown
## Completion Contract
Task is NOT complete until ALL conditions are met:
1. Draft written to output/drafts/[date]-[slug].md
2. CIS quality score ≥ 7 (self-assessed)
3. Zero placeholder content or fabricated data
4. All data points verified from real files
5. File path reported back
```

For coding:
```markdown
1. Code runs without errors
2. Output pasted in response
3. File path reported
4. PR created (not pushed to main)
```

For research:
```markdown
1. Report in output/research/[date]-[slug].md
2. Numerical score (1-10) with reasoning
3. Actionable recommendations (not just summary)
4. Signal data written to data/signals/
```

**Not guidance. Hard boundary.** "Not meeting these conditions = task failure."

### File 3: Memory (3 layers)

```
MEMORY.md          → Institutional brain (projects, team, finances)
memory/sync.md     → Real-time decision log (timestamped)
memory/lessons.md  → Mistakes by category (dated)
```

Example sync entry:
```
[2026-03-01 14:30] [samantha] Rex confirmed: fixed opus 4.6 for all creative agents
```

Example lesson:
```
[2026-02-27] FINANCE: portfolio-rebalance.py failed silently for 13 days.
Wrong file path after update. No error logs. Dashboard showed stale data.
Fix: All scripts must write last_run timestamp to output file.
```

Memory gets pruned on a strict schedule: P0 = permanent, P1 = 90 days, P2 = 30 days. Without pruning, context bloats and agents slow down.

---

## The 19 Cron Jobs

| Time      | Job                     | Agent    |
| --------- | ----------------------- | -------- |
| 01:00     | thinking-vision         | Vision   |
| 01:30     | thinking-loki           | Loki     |
| 02:00     | thinking-friday         | Friday   |
| 02:30     | thinking-jarvis         | Jarvis   |
| 03:00     | thinking-shuri          | Shuri    |
| 03:30     | thinking-samantha       | Samantha |
| 04:00     | autonomous-employee     | Samantha |
| 07:00     | morning-delivery        | Samantha |
| 08:00     | alpha-radar-daily       | Vision   |
| 09:00     | content-draft-morning   | Loki     |
| 10:00     | daily-reading           | Samantha |
| 10:30     | podcast-digest          | Samantha |
| 17:00     | clawfeed-evening        | Default  |
| 18:00     | content-draft-evening   | Loki     |
| 19:30 Mon | meme-update-weekly      | Loki     |
| 09:30 Sat | twitter-weekly-review   | Friday   |
| 19:00 Sat | agent-ops-weekly        | Loki     |
| 20:00 Sun | weekly-framework-review | Samantha |
| 22:00     | evening-report          | Samantha |

Each thinking cron (01:00-03:30) scans for strategic gaps, produces proposals or reports "no action needed." Not every run produces output — and that's by design.


---

## What Broke (Honest List)

**Silent failure (13 days).** Portfolio script broke after a path change. No errors, no alerts. Dashboard showed old data that looked normal. Caught it during a random code review.
→ Fix: every script writes `last_run` timestamp. Review checks freshness.

**Fabricated data.** Content agent wrote "8%+ stablecoin yields on Minswap and Spectrum." Numbers, platforms, mechanics — all made up. Looked completely real.
→ Fix: completion contract rule — "zero fabricated data, verify from real files first."

**Auth rotation chaos.** Sub-agent tokens expire. When they do, tasks fail silently or produce garbage. Happened twice a day during the worst week.
→ Fix: dedicated `google-token-refresh` cron at 05:30 daily.

**Context overflow.** AGENTS.md at 209 lines. Agents hallucinated rules, mixed responsibilities, followed instructions meant for other agents.
→ Fix: 209 → 75 lines. Routing table, not encyclopedia.

**Duplicate content.** Morning cron produced a "bonus draft" using the same material as yesterday's published tweet. No dedup check.
→ Fix: draft generation now checks last 7 days of output/ before writing.

**Image generation failures.** Missing API keys in sub-agent environment. First 3 attempts failed before discovering the key wasn't inherited.
→ Fix: explicit `GEMINI_API_KEY` sourced from config before generation.


---

## The Compound Effect (Five Weeks+)

This is the part nobody writes about because it takes months to experience.

**Taste extraction compounds.** Every time I edit a draft, the system diffs original vs my version and extracts a rule. 22 rules across 5 editing sessions. First drafts are measurably closer to what I'd write. The gap between draft and final shrinks with each iteration.

Example rules extracted from real edits:
- #13: Parallel examples → use bullet list, not paragraphs
- #18: Concrete product names > vague claims ("Claude Max 20x" not "enough tokens")
- #19: Strong parallel ending needs no explanation sentence
- #21: End with engagement question, not reflective lesson

**Routing gets sharper.** Early: tasks misrouted constantly. Content-adjacent research went to the writer. System issues bounced between agents. After 700 sessions, the routing table is tight. Six agents, six clearly bounded scopes.

**Contracts get specific.** First contracts: "Write a good report." Current contracts: file path, required sections, scoring methodology, verification steps. The definition of "done" evolved through hundreds of iterations.

---

## If You're Starting Today

1. One agent. One job. One completion contract with 4 conditions.
2. See what breaks. Fix with one rule. Not five.
3. Add a second agent only when the first is reliable.
4. Write rules after failures, not before. Pre-written rules are guesses.
5. Review weekly. Kill rules that aren't working. Merge overlaps.
6. Keep memory lean. Expire what's stale on a strict schedule.

**My single realization after 700 sessions:**

The agents are fine. The engineering around them is what matters. Your config is a routing table. Your rules are hypotheses. Your contracts are the only thing between "attempted" and "completed."

Tend the system weekly. Pull the weeds. That's the whole secret.
