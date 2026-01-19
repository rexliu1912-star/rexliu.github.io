import type { AstroExpressiveCodeOptions } from "astro-expressive-code";
import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
	// 决定了作者元数据标签
	author: "Rex Liu",
	// 添加这一行 (如果 SiteConfig 类型允许)
	twitterHandle: "@rexliu",
	// 修正日期配置，确保与中文环境一致
	date: {
		locale: "zh-CN",
		options: {
			day: "numeric",
			month: "short",
			year: "numeric",
		},
	},
	// 核心修改：决定分享时的描述文字
	description: "Be The Sovereign Individual You Want To See In The World",
	// 确保 HTML 语言标记正确
	lang: "zh-CN",
	// 社交媒体识别的语言区域
	ogLocale: "zh_CN",
	/* 核心修改：
        - 这将作为分享时的网页大标题
    */
	title: "Rex Liu",
	// 请确保这里的域名是你实际部署的地址，否则 OG 图片路径会生成错误
	url: "https://rexliu.io/",
};

// 后续菜单和代码块配置保持不变...
export const menuLinks: { path: string; title: string }[] = [
	{
		path: "/",
		title: "Home",
	},
	{
		path: "/posts/",
		title: "Blog",
	},
	{
		path: "/notes/",
		title: "Notes",
	},
];

export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
	styleOverrides: {
		borderRadius: "4px",
		codeFontFamily:
			'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		codeFontSize: "0.875rem",
		codeLineHeight: "1.7142857rem",
		codePaddingInline: "1rem",
		frames: {
			frameBoxShadowCssValue: "none",
		},
		uiLineHeight: "inherit",
	},
	// Copy button configuration
	frames: {
		removeCommentsWhenCopyingTerminalFrames: true, // Remove # comments in terminal blocks
	},
	themeCssSelector(theme, { styleVariants }) {
		if (styleVariants.length >= 2) {
			const baseTheme = styleVariants[0]?.theme;
			const altTheme = styleVariants.find((v) => v.theme.type !== baseTheme?.type)?.theme;
			if (theme === baseTheme || theme === altTheme) return `[data-theme='${theme.type}']`;
		}
		return `[data-theme="${theme.name}"]`;
	},
	themes: ["dracula", "github-light"],
	useThemedScrollbars: false,
};
