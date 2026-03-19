import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

function removeDupsAndLowerCase(array: string[]) {
	return [...new Set(array.map((str) => str.toLowerCase()))];
}

const titleSchema = z.string().max(100);

const baseSchema = z.object({
	title: titleSchema,
});

// 1. 定义 Post 集合
const post = defineCollection({
	loader: glob({ base: "./src/content/post", pattern: "**/*.{md,mdx}" }),
	schema: ({ image }) =>
		baseSchema.extend({
			description: z.string(),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			draft: z.boolean().default(false),
			ogImage: z.string().optional(),
			originalUrl: z.string().url().optional(),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			publishDate: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			updatedDate: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
			// 确保置顶字段正确定义
			pinned: z.boolean().default(false),
		}),
});

// 2. 定义 Note 集合（之前报错就是因为这里可能被漏掉了）
const note = defineCollection({
	loader: glob({ base: "./src/content/note", pattern: "**/*.{md,mdx}" }),
	schema: baseSchema.extend({
		description: z.string().optional(),
		publishDate: z
			.string()
			.datetime({ offset: true })
			.transform((val) => new Date(val)),
	}),
});

// 3. 定义 Tag 集合
const tag = defineCollection({
	loader: glob({ base: "./src/content/tag", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: titleSchema.optional(),
		description: z.string().optional(),
	}),
});

// 4. Lab Digest 集合
const digest = defineCollection({
	loader: glob({ base: "./src/content/digest", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		title_zh: z.string().optional(),
		date: z.coerce.date(),
		source: z.string().url().optional(),
		source_name: z.string().optional(),
		tags: z.array(z.string()).default([]),
		summary: z.string().optional(),
		summary_zh: z.string().optional(),
	}),
});

// 5. Lab Projects 集合
const projects = defineCollection({
	loader: glob({ base: "./src/content/projects", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		title_zh: z.string().optional(),
		description: z.string(),
		description_zh: z.string().optional(),
		status: z.enum(["running", "building", "planning"]),
		icon: z.string().optional(),
		url: z.string().optional(),
		order: z.number().default(0),
	}),
});

// 6. Builder's Log 集合
const builderLog = defineCollection({
	loader: glob({ base: "./src/content/builder-log", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		title_zh: z.string().optional(),
		date: z.coerce.date(),
		summary: z.string(),
		summary_zh: z.string().optional(),
		highlights: z.array(z.string()).default([]),
		agents: z.array(z.string()).default([]),
	}),
});

// 7. AI Timeline 集合
const aiTimeline = defineCollection({
	loader: glob({ base: "./src/content/ai-timeline", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		title_zh: z.string().optional(),
		date: z.coerce.date(),
		category: z.enum(["model", "funding", "industry", "robotics", "crypto-ai", "product"]),
		tags: z.array(z.string()).default([]),
		source: z.string().url().optional(),
		source_name: z.string().optional(),
		company: z.string().optional(),
		significance: z.enum(["high", "medium", "low"]).default("medium"),
		body_zh: z.string().optional(),
	}),
});

// 8. SNEK Daily 集合
const snekDaily = defineCollection({
	loader: glob({ base: "./src/content/snek-daily", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		title_zh: z.string().optional(),
		date: z.coerce.date(),
		btc_price: z.string().optional(),
		btc_change: z.string().optional(),
		ada_price: z.string().optional(),
		snek_price: z.string().optional(),
		summary: z.string().optional(),
		summary_zh: z.string().optional(),
	}),
});

// 9. Bookmarks 集合
const bookmarks = defineCollection({
	loader: glob({ base: "./src/content/bookmarks", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		tweet_id: z.string(),
		author: z.string(),
		author_name: z.string(),
		avatar: z.string().default(""),
		text: z.string(),
		card_title: z.string().default(""),
		likes: z.number().default(0),
		retweets: z.number().default(0),
		url: z.string().url(),
		created_at: z.coerce.date(),
		bookmarked_at: z.coerce.date().optional(),
		categories: z.array(z.string()).default(["general"]),
	}),
});

// 10. 统一导出
export const collections = { post, note, tag, digest, projects, "builder-log": builderLog, "ai-timeline": aiTimeline, "snek-daily": snekDaily, bookmarks };
