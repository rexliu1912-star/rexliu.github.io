<div align="center">
  <img alt="Rex Liu" src="public/avatar.png" width="90" />
</div>

<h1 align="center">rexliu.io</h1>

<div align="center">
  <p><strong>A digital home for a Crypto OG, builder, and digital nomad.</strong></p>
  <p>Stay Invested in the Game 🐍</p>
</div>

---

## What This Is

This is the personal website of **Rex Liu** — a 2017 crypto survivor, vibe coder, and father of one, living a nomadic life across Asia with his family.

It's not just a blog. It's a working record of how I think, what I build, and what I'm learning — in public, in real time.

> "I don't post to perform. I post to think out loud, document the journey, and stay accountable."

---

## Why It Exists

Most personal sites are either portfolios (look how good I am) or blog graveyards (abandoned after 3 posts).

This one is different — it's designed to **compound over time**.

Every article, digest, signal, and builder log adds a layer. The goal is that six months from now, a reader can trace exactly how my thinking evolved: on crypto cycles, on AI tools, on what it means to be a sovereign individual in 2025+.

**For the reader, this site offers:**

- **Unfiltered takes** on crypto markets, AI agents, and investment philosophy — not summaries, not hype, but how a real practitioner actually thinks
- **Builder transparency** — what I'm building, what broke, what worked, in the rare format of someone who actually ships
- **Cross-cultural bridge** — EN/中文 bilingual throughout, because the best insights often live in one language and get lost in translation
- **Weekly digests** that surface the most signal-rich content from the internet, filtered through a specific lens (long-term investing, AI × crypto, sovereign living)

---

## Key Sections

| Section | What It Is |
|---------|-----------|
| **Posts** (`/posts/`) | Long-form essays — crypto analysis, investment philosophy, life decisions, AI experiments |
| **Lab** (`/lab/`) | A content lab: Daily Digest, SNEK Daily, Builder's Log, Projects, Visual Thinking experiments |
| **Travel** (`/travel/`) | Interactive map of our digital nomad journey since Oct 2025 |
| **OS** (`/os/`) | Library (books, films, shows I've consumed), X Growth data |
| **Visual Thinking** (`/lab/visual/`) | 4 interactive math experiments — crypto cycles, neural graphs, compound growth, Bezier paths — each connected to a philosophy |

---

## Design Philosophy

**Less is more.** The site uses a serif font, generous whitespace, and a single brand color (purple `#8953d1`). No distractions.

**Bilingual is a feature, not a translation.** EN content is written in English; Chinese content is rewritten in Chinese — not translated. They're different voices for different contexts.

**Magazine mode.** Articles can be switched to a two-column magazine layout powered by [@chenglou/pretext](https://github.com/chenglou/pretext) — a pure-TypeScript text measurement engine. Because reading long-form content should feel like reading, not scrolling.

**Every article has a soul.** Posts are decorated with tag-based SVG animations: a sine wave for crypto, a neural pulse for AI, a rising chart for investment, a compass for travel. They fade out after 8 seconds.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro v5](https://astro.build) |
| Styling | Tailwind CSS v4 |
| Content | MDX + Astro Content Collections |
| Search | [Pagefind](https://pagefind.app) (static, zero backend) |
| Comments | Giscus (GitHub Discussions) |
| CDN | Cloudflare Pages + R2 (`cdn.rexliu.io`) |
| Backend | Convex (nudge counter, library reactions) |
| Magazine mode | [@chenglou/pretext](https://github.com/chenglou/pretext) |

---

## Architecture

```
rexliu.io (Cloudflare Pages)
    └── GitHub: rexliu1912-star/rexliu.github.io
    
cdn.rexliu.io (Cloudflare R2)
    └── Bucket: rexliu-cdn (APAC)
    └── Content: /images/posts/, /images/travel/, /music/
    
samantha.rexliu.io (Cloudflare Pages)
    └── Samantha's journal (separate repo)
```

### Project Structure

```
src/
├── pages/          # Routes (posts, lab, travel, os, ...)
├── content/        # MDX content collections
│   ├── post/       # Long-form articles
│   ├── digest/     # Weekly digests
│   ├── builder-log/# Builder's log entries
│   ├── snek-daily/ # SNEK ecosystem daily
├── components/     # UI components
│   ├── blog/       # MagazineView, TagAnimation, ReadingProgress
│   └── lab/        # VisualExperiments (interactive math)
├── layouts/        # Base, BlogPost, ...
└── styles/         # Global CSS, Tailwind config
public/             # Static assets (avatar, covers, ...)
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/rexliu1912-star/rexliu.github.io.git
cd rexliu.github.io

# Install (pnpm recommended)
pnpm install

# Dev server
pnpm dev
# → http://localhost:4321

# Build
pnpm build

# Type check
pnpm astro check
```

---

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start local dev server at `localhost:4321` |
| `pnpm build` | Build to `./dist/` |
| `pnpm preview` | Preview production build locally |
| `pnpm astro check` | Run type checking |
| `pnpm sync` | Sync content collection types |

---

## Content on CDN

Article cover images and travel photos are served from Cloudflare R2:

```bash
# Upload a new cover image
source ~/clawd/scripts/.env
curl -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/rexliu-cdn/objects/images/posts/your-image.png" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @./your-image.png
```

Then reference as `https://cdn.rexliu.io/images/posts/your-image.png` in frontmatter.

---

## About Rex

- **@rexliu** on X — 6.4k followers, crypto and AI builder content
- In crypto since 2017, survived the 2018 bear market (-80%), still here
- Ex-PM (10+ years), turned free agent in 2025
- Digital nomad since Oct 2025 with wife and 4-year-old daughter
- Based wherever the WiFi is good

→ [rexliu.io](https://rexliu.io) · [X / @rexliu](https://x.com/rexliu)

---

## License

MIT — fork it, learn from it, build your own version.
