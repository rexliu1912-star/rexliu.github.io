import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site.config";

export const GET = async (context: APIContext) => {
	const posts = await getAllPosts();

	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: context.site ?? siteConfig.url,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.publishDate,
			link: `posts/${post.id}/`,
			// Include the full markdown/mdx content
			content: post.body,
		})),
		customData: "<language>zh-cn</language>",
	});
};
