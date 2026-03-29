---
title: "How I Built a Human-AI Knowledge System with Obsidian + OpenClaw"
description: "A step-by-step guide to using Obsidian as the shared memory layer between you and AI agents. From installation to daily workflows."
publishDate: "2026-03-19"
tags: ["AI", "Productivity", "Build in Public"]
coverImage:
  src: "https://cdn.rexliu.io/images/posts/2026-03-19-obsidian-openclaw-cover.png"
  alt: "Obsidian + OpenClaw Knowledge System Cover"
---

Obsidian is an amazing note-taking app and I use it as the shared memory layer between myself and six AI agents.

This post walks through the system I've been running for the past two months — from installation to daily workflows — and how you can build something similar from scratch. No coding background required.

## Why I Moved from Flomo to Obsidian

I used Flomo for years. It is still great for capturing thoughts quickly, and now it even has MCP experiments.

But for my workflow in the AI era, the real requirement became much simpler: **I wanted my notes to exist as local markdown files.**

That was the main reason I moved to Obsidian.

Once every note became a file on disk, the whole system became clearer. I could organize the vault however I wanted, sync it across devices, and let AI tools read the same files directly.

## Setting Up Obsidian (The Parts That Might Trip You Up)

**Install Obsidian:**
Go to [obsidian.md](https://obsidian.md) and download the app. It's free for personal use. Available on Mac, Windows, Linux, iOS, and Android.

**Create a vault:**
When you first open Obsidian, it asks you to create or open a vault. A vault is just a folder on your computer. Pick a location you'll remember — I use `~/clawd/knowledge/`.

<!-- 📸 Screenshot: Obsidian "Create new vault" dialog -->

**Common gotchas for beginners:**
- **"Where are my files?"** — Obsidian vaults are regular folders. Open Finder (Mac) or Explorer (Windows), navigate to your vault path, and you'll see `.md` files. This is the whole point: your notes are just files.
- **"Do I need plugins?"** — Not to start. The core app is enough. I use four community plugins after months of use: Templater, Tasks, Calendar, and Style Settings. Don't install anything on day one.
- **"What about mobile?"** — The iOS/Android app works well. The sync question is below.

## Solving the Sync Problem

This is where most people get stuck. Obsidian stores files locally, so you need a sync solution if you use multiple devices.

**Option A: Obsidian Sync (simplest)**

Obsidian offers its own sync service. The basic plan costs $4/month (billed annually) and covers all your devices — phone, laptop, desktop. It works out of the box: enable it in Settings → Sync, and your vault stays identical everywhere.

If you just want Obsidian on your phone and laptop, this is all you need. Stop here.

**Option B: Syncthing (what I use — free)**

My situation is different. I run AI agents on a Mac mini that sits in a closet — no monitor, no keyboard, no Obsidian app. It's a headless server. Obsidian Sync won't help here because there's no Obsidian instance to sync.

I use [Syncthing](https://syncthing.net) — a free, open-source tool that syncs folders directly between devices over your local network (or the internet).

To be clear: Syncthing is not just for Obsidian. It's my general file sync solution between MacBook and Mac Mini — the entire workspace folder stays mirrored, which includes the Obsidian vault, agent output, code projects, everything.

```
MacBook (Obsidian + daily use)
        ↕ Syncthing (entire ~/clawd/ workspace)
Mac mini (headless, runs OpenClaw agents 24/7)
```

When I write a note on my MacBook, it appears on the Mac Mini within seconds. When an agent writes a draft on the Mac Mini, it shows up in my Obsidian vault on the MacBook.

**How to set up Syncthing (5 minutes):**

1. Install on both devices:
```bash
# Mac
brew install syncthing

# Or download from syncthing.net for any platform
```

2. Open the web UI on each device (`http://127.0.0.1:8384`), add each device as a peer, and share your vault folder.

3. Add a `.stignore` file in your shared folder to skip unnecessary files:
```
**/node_modules
**/.git
**/.next
**/dist
**/__pycache__
.DS_Store
```

That's it. The two machines now mirror the folder in real time.

<!-- 📸 Diagram: Syncthing sync flow between MacBook and Mac mini -->

**Option C: iCloud / Dropbox / Google Drive**

These work for basic Obsidian sync between your own devices in the same account. But they can cause conflicts with AI agents writing files simultaneously and as I've given OpenClaw new identities, Syncthing works better and handles concurrent writes more predictably.

## Connecting AI to Your Vault (Three Approaches)

Before getting into my full setup, here's the landscape. You have options depending on your comfort level:

**Approach 1: Claudian plugin (simplest — same device)**

If you just want AI inside Obsidian on the same computer, install [Claudian](https://github.com/YishenTu/claudian) — a community plugin that embeds Claude Code directly into Obsidian's sidebar. Your vault becomes Claude's workspace. It can read, write, and edit your notes through a chat interface without leaving the app.

This is the lowest-friction option. No terminal, no server setup. Open Obsidian, install the plugin, and start chatting with an AI that has full access to your vault.

Good for: individual use on one machine, quick Q&A against your notes, having AI help organize or write within your vault.

**Approach 2: Claude Desktop + MCP file system**

Claude Desktop supports MCP (Model Context Protocol) servers. Point it at your vault folder, and Claude can read your notes during conversations. More flexible than the plugin, works across apps.

**Approach 3: OpenClaw (what I use — multi-agent, multi-device)**

This is the full system: multiple AI agents running on a headless server, each with different roles, reading and writing to the shared vault 24/7. More setup, but it scales to automated workflows. The rest of this post covers this approach.

## My Full Setup (OpenClaw + Multi-Agent)

Here's what my workspace looks like:

```
~/clawd/
├── knowledge/          ← Obsidian vault (7,100 files)
│   ├── rex/            ← My Flomo notes (1,142 entries)
│   │   ├── crypto/     ← Investment thinking
│   │   ├── ai/         ← AI observations
│   │   ├── life/       ← Personal reflections
│   │   └── journal/    ← Daily logs
│   ├── distilled/      ← Frameworks extracted from raw notes
│   │   ├── frameworks/         ← AI / Crypto / Macro / Robotics
│   │   ├── investment-journal/ ← 102 decision records
│   │   └── market-events/      ← Market event post-mortems
│   └── reference/      ← External sources (articles, books)
├── memory/             ← Agent daily logs
├── output/             ← Deliverables (drafts, research, briefings)
├── runbooks/           ← Automated workflow definitions
├── skills/             ← Agent capabilities
├── MEMORY.md           ← Long-term preferences & rules
└── AGENTS.md           ← Team roster & routing logic
```

<!-- 📸 Screenshot: Obsidian sidebar showing the knowledge/ folder tree -->

The Obsidian vault sits inside `knowledge/`. Everything else surrounds it — memory, output, runbooks. The vault is the brain. The rest is the operating system.

## Connecting AI Agents (Step by Step)

You do not need to overcomplicate this part. If you choose OpenClaw, the minimum setup is only four steps.

### 1. Install OpenClaw

```bash
npm i -g openclaw@latest
openclaw init
```

During setup, OpenClaw will ask for your model provider.

### 2. Point it at your workspace

Set the workspace path in `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/clawd"
    }
  }
}
```

### 3. Add one memory file

Create `~/clawd/MEMORY.md` and write a few lines about who you are, what you care about, and how you want the AI to respond.

For example:

```markdown
# MEMORY.md
- I write about AI, crypto, and investing.
- Keep replies concise.
- If unsure, ask instead of guessing.
- Never fabricate facts or quotes.
```

### 4. Start the conversation

```bash
openclaw chat
```

Then ask something simple like:

> Read my notes in `knowledge/` and summarize the themes you see.

That is enough to get started.

If you use Claude Desktop, Cursor, or Claudian instead, the principle is the same: give the AI access to your vault folder, then let it read the files directly.

## The Feedback Loop (Where It Gets Powerful)

The system compounds when agents write back into the vault.

**What agents read:**
- `knowledge/rex/` — My original thinking
- `knowledge/distilled/` — Extracted frameworks
- `MEMORY.md` — Preferences and rules

**What agents write:**
- `memory/` — Daily activity logs
- `output/drafts/` — Content drafts
- `output/research/` — Research memos
- `knowledge/distilled/` — New frameworks distilled from accumulated data

The loop: I write notes → agents read them → agents produce output → I review and correct → corrections go into MEMORY.md → agents improve next time.

After two months of this loop, my writing agent needs fewer edits on every draft. It learned my voice from 1,142 real notes and dozens of corrections — not from a generic prompt.

## A Real Example: How a Tweet Gets Made

Here's an actual workflow from this week:

1. **9:30 AM** — A scheduled job triggers Loki (my writer agent) to draft tweets
2. **Loki reads** my Flomo notes about Hyperliquid, a research report in `output/research/`, and my investment rules from `MEMORY.md`
3. **Loki writes** two draft versions with different hooks
4. **Loki sends** the drafts to Discord for my review
5. **I pick one**, edit a few words
6. **The edit gets diffed** — the system extracts the pattern ("Rex shortened this sentence, prefers direct phrasing over contrast structures") and appends it to the writing rules
7. **Next time**, Loki reads those updated rules and writes closer to my taste

The result is not AI replacing my voice. It's AI learning my voice through structured repetition.

<!-- 📸 Screenshot: Discord showing a draft review conversation -->

## Getting Started Today (The Minimum Version)

You don't need six agents and 30 runbooks. Here's the smallest useful version:

**15-minute setup:**

1. Install Obsidian → create a vault → dump your existing notes in (Flomo export, Apple Notes, whatever)
2. Install OpenClaw (or use Claude Desktop / Cursor)
3. Create one file: `MEMORY.md` with 5-10 lines about yourself
4. Ask the AI: "Read my notes and tell me what patterns you see"

That's it. You now have an AI that knows your actual thoughts instead of starting from zero every conversation.

**Scale when you feel friction:**

- Add `output/` folder when you want agents to save drafts
- Add `runbooks/` when you want scheduled workflows
- Add more agents when one isn't enough
- Set up Syncthing when you need multi-device access

## The Result

After two months:
- 6 agents running 24/7 on a Mac mini
- 30+ automated workflows (content, research, data analysis)
- 7,100 knowledge files accessible to every agent
- Drafts that match my writing voice closely enough that I often publish with minor edits
- A compounding system — every correction makes the next output better

The Obsidian vault is not a static archive. It's a living context layer that makes every AI interaction more personal and more useful.

If you're already taking notes somewhere, you're halfway there. The other half is giving an AI agent a reason to read them.

---

*Tools: [Obsidian](https://obsidian.md) (free) + [OpenClaw](https://github.com/openclaw/openclaw) (open source) + [Syncthing](https://syncthing.net) (free). My setup runs on a Mac mini M4. Monthly cost: AI API usage only.*
