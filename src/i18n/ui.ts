/**
 * UI Dictionary — Bilingual labels for the entire site.
 * Usage: import { t } from "@/i18n/utils"; t("nav.lab", lang)
 */

export const ui = {
	// Navigation
	"nav.lab": { en: "Rex's Lab", zh: "Rex's Lab" },
	"nav.posts": { en: "Posts", zh: "文章" },
	"nav.notes": { en: "Notes", zh: "随笔" },
	"nav.tags": { en: "Tags", zh: "标签" },

	// Lab page
	"lab.title": { en: "Rex's Lab", zh: "Rex's Lab" },
	"lab.subtitle": {
		en: "Every moment of the AI era, curated readings, and experiments in crypto & AI.",
		zh: "AI 时代的每个瞬间，精选阅读，以及加密与 AI 的实验。",
	},

	// AI Timeline
	"timeline.title": { en: "AI Timeline", zh: "AI 大事记" },
	"timeline.view_full": { en: "View full timeline →", zh: "查看完整时间线 →" },
	"timeline.all_categories": { en: "All", zh: "全部" },
	"timeline.all_companies": { en: "All Companies", zh: "所有公司" },
	"timeline.category.model": { en: "Model", zh: "模型" },
	"timeline.category.product": { en: "Product", zh: "产品" },
	"timeline.category.funding": { en: "Funding", zh: "融资" },
	"timeline.category.industry": { en: "Industry", zh: "行业" },
	"timeline.category.robotics": { en: "Robotics", zh: "机器人" },
	"timeline.category.crypto-ai": { en: "Crypto×AI", zh: "Crypto×AI" },

	// Daily section
	"daily.title": { en: "Daily", zh: "每日更新" },

	// Digest
	"digest.title": { en: "Digest", zh: "精选阅读" },
	"digest.view_all": { en: "View all digests →", zh: "查看全部精选 →" },

	// SNEK Daily
	"snek.title": { en: "SNEK Daily", zh: "SNEK 日报" },
	"snek.view_all": { en: "View all dailies →", zh: "查看全部日报 →" },

	// Builder's Log
	"builder.title": { en: "Builder's Log", zh: "Builder's Log" },
	"builder.view_all": { en: "View all logs →", zh: "查看全部日志 →" },

	// Projects
	"projects.title": { en: "Projects", zh: "项目" },
	"projects.status.running": { en: "running", zh: "运行中" },
	"projects.status.building": { en: "building", zh: "开发中" },
	"projects.status.planning": { en: "planning", zh: "规划中" },

	// Language toggle
	"lang.switch": { en: "中文", zh: "EN" },
	"lang.fallback": {
		en: "Translation coming soon",
		zh: "翻译即将上线",
	},

	// Common
	"common.back": { en: "← Back", zh: "← 返回" },
	"common.read_more": { en: "Read more", zh: "阅读更多" },
} as const;

export type UIKey = keyof typeof ui;
export type Lang = "en" | "zh";
