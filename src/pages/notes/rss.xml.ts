import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { siteConfig } from "@/site.config";

export const GET = async (context: APIContext) => {
	const notes = await getCollection("note");
	const sortedNotes = notes.sort(
		(a, b) => new Date(b.data.publishDate).valueOf() - new Date(a.data.publishDate).valueOf(),
	);

	return rss({
		title: `${siteConfig.title} - Notes`,
		description: siteConfig.description,
		site: context.site ?? siteConfig.url,
		items: sortedNotes.map((note) => ({
			title: note.data.title,
			description: note.data.description,
			pubDate: note.data.publishDate,
			link: `notes/${note.id}/`,
			// Include the full markdown/mdx content
			content: note.body,
		})),
		customData: "<language>zh-cn</language>",
	});
};
