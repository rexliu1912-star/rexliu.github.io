# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal blog and digital garden built with **Astro v5** and **Tailwind CSS v4**. The site features bilingual content (English/Chinese), an activity graph integrating GitHub commits, blog posts, and Flomo notes, and full-text search powered by Pagefind.

## Development Commands

```bash
# Install dependencies (includes sharp rebuild postinstall)
pnpm install

# Start dev server at http://localhost:3000
pnpm dev

# Type checking and linting
pnpm check

# Build for production (includes Pagefind indexing)
pnpm build

# Preview production build
pnpm preview

# Lint and auto-fix with Biome
pnpm lint

# Format with Prettier
pnpm format

# Sync Astro content collection types
pnpm sync
```

## Architecture

### Content Collections

Defined in `src/content.config.ts` using Astro's file-based loader system:

- **post**: Blog articles (`src/content/post/**/*.{md,mdx}`)
  - Schema includes: title, description, coverImage, draft, ogImage, originalUrl, tags, publishDate, updatedDate, pinned
  - Reading time is auto-calculated via remark plugin

- **note**: Short-form notes (`src/content/note/**/*.{md,mdx}`)
  - Schema includes: title, description (optional), publishDate (ISO datetime with offset)

- **tag**: Tag metadata (`src/content/tag/**/*.{md,mdx}`)
  - Optional title and description for tag pages

### Routing & Pages

- **Dynamic routes** use Astro's `[...slug]` and `[...page]` patterns:
  - `/posts/[...slug].astro` - Individual blog post pages
  - `/posts/[...page].astro` - Paginated post listing
  - `/notes/[...slug].astro` - Individual note pages
  - `/notes/[...page].astro` - Paginated note listing
  - `/tags/[tag]/[...page].astro` - Tag-filtered post listings

- **RSS feeds**: Auto-generated at `/rss.xml` and `/notes/rss.xml`

- **OG Images**: Dynamically generated using Satori at `/og-image/[...slug].png.ts`

### Activity Graph System

The `src/components/ActivityGraph.astro` component aggregates three data sources:

1. **GitHub Contributions**: Fetched via GitHub GraphQL API using `GITHUB_TOKEN` env variable
2. **Blog Posts**: Counted from Astro content collections by `publishDate`
3. **Flomo Notes**: Loaded from preprocessed `src/data/flomo-stats.json` (privacy-safe, contains only dates and counts)

The graph displays the past 365 days in a GitHub-style heatmap with 5 intensity levels (0-4) based on combined activity.

### Custom Remark/Rehype Plugins

Located in `src/plugins/`:

- **remark-reading-time.ts**: Calculates estimated reading time and adds to frontmatter
- **remark-github-card.ts**: Renders GitHub repository cards
- **remark-admonitions.ts**: Processes `:::` directive syntax for callout blocks
- **remarkDirective**: Handles directive syntax as AST nodes

Rehype plugins configured in `astro.config.ts`:
- `rehypeHeadingIds`: Adds IDs to headings
- `rehypeAutolinkHeadings`: Wraps headings in anchor links
- `rehypeExternalLinks`: Adds `rel` and `target` to external links
- `rehypeUnwrapImages`: Unwraps images from paragraph tags

### Styling System

- **Tailwind CSS v4** with custom configuration in `tailwind.config.ts`
- **Typography**: Uses `@tailwindcss/typography` for prose content styling
- **Theme**: Dark/light mode switching via `data-theme` attribute
- **Colors**: Primary brand color is purple (`#8953d1` light, `#a175e8` dark)
- **Fonts**: Loaded via custom Vite plugin that converts font files to buffers for OG image generation

### Configuration Files

- **src/site.config.ts**: Central site metadata (author, title, description, URL, date formatting, menu links, code theme)
- **astro.config.ts**: Astro integrations, markdown plugins, Vite config
- **biome.json**: Linting and formatting rules (tabs, 100 line width, organize imports)

## Code Style Guidelines

- **Formatting**: Tabs for indentation (per Biome config), 100 character line width
- **Imports**: Auto-organized with Biome, use type imports where applicable
- **TypeScript**: Avoid explicit `any` types (warn level), use type inference
- **Astro**: `.astro` files have relaxed linting (unused vars/imports allowed)

## Environment Variables

- `GITHUB_TOKEN`: Required for Activity Graph GitHub contributions (server-side)
- `WEBMENTION_API_KEY`: Optional for webmentions (server-side, secret)
- `WEBMENTION_URL`: Optional for webmentions (client-side, public)
- `WEBMENTION_PINGBACK`: Optional for webmentions (client-side, public)

## Content Authoring

### Adding Blog Posts

Create `.md` or `.mdx` files in `src/content/post/` with frontmatter:

```yaml
---
title: "Post Title"
description: "Post description for meta tags"
publishDate: "2025-01-15"
tags: ["tag1", "tag2"]
draft: false
pinned: false
originalUrl: "https://..." # optional, shows "Original Link" in post header
coverImage: # optional
  src: ./image.jpg
  alt: "Image description"
ogImage: "/custom-og-image.png" # optional, overrides auto-generated OG image
---
```

### Adding Notes

Create `.md` or `.mdx` files in `src/content/note/` with ISO datetime:

```yaml
---
title: "Note Title"
description: "Optional description"
publishDate: "2025-01-15T10:30:00+08:00"
---
```

### Custom MDX Components

Use admonition syntax in content:

```markdown
:::note
This is a note admonition
:::

:::warning
This is a warning
:::
```

Supported types: tip, note, important, caution, warning

## Build Process

1. `astro build` - Builds static site to `./dist/`
2. `pagefind --site dist` - Indexes site for full-text search (postbuild step)

The build outputs a static site ready for deployment to any static hosting platform.

## TypeScript Types

Key types defined in `src/types.ts`:

- `SiteConfig`: Site-wide configuration shape
- `SiteMeta`: Page-level metadata (title, description, ogImage, articleDate)
- `PaginationLink`: Pagination link structure
- `WebmentionsChildren`, `WebmentionsFeed`, etc.: Webmentions API types
- `AdmonitionType`: Allowed admonition types
