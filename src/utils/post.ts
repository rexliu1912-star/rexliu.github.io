import type { CollectionEntry } from "astro:content";

/**
 * Get related posts based on tag similarity
 * @param currentPost - The current post
 * @param allPosts - All available posts
 * @param limit - Maximum number of related posts to return (default: 3)
 * @returns Array of related posts sorted by relevance
 */
export function getRelatedPosts(
	currentPost: CollectionEntry<"post">,
	allPosts: CollectionEntry<"post">[],
	limit = 3,
): CollectionEntry<"post">[] {
	const currentTags = currentPost.data.tags || [];

	// If current post has no tags, return most recent posts
	if (currentTags.length === 0) {
		return allPosts
			.filter((post) => post.id !== currentPost.id && !post.data.draft)
			.slice(0, limit);
	}

	// Calculate similarity score for each post
	const postsWithScores = allPosts
		.filter((post) => post.id !== currentPost.id && !post.data.draft)
		.map((post) => {
			const postTags = post.data.tags || [];

			// Calculate number of shared tags
			const sharedTags = currentTags.filter((tag) => postTags.includes(tag));
			const score = sharedTags.length;

			return {
				post,
				score,
			};
		})
		.filter((item) => item.score > 0) // Only posts with at least one shared tag
		.sort((a, b) => {
			// Sort by score (descending), then by date (most recent first)
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			return b.post.data.publishDate.getTime() - a.post.data.publishDate.getTime();
		});

	// If we have enough posts with shared tags, return them
	if (postsWithScores.length >= limit) {
		return postsWithScores.slice(0, limit).map((item) => item.post);
	}

	// Otherwise, fill remaining slots with most recent posts
	const relatedPosts = postsWithScores.map((item) => item.post);
	const remainingSlots = limit - relatedPosts.length;

	if (remainingSlots > 0) {
		const recentPosts = allPosts
			.filter(
				(post) =>
					post.id !== currentPost.id &&
					!post.data.draft &&
					!relatedPosts.some((rp) => rp.id === post.id),
			)
			.slice(0, remainingSlots);

		relatedPosts.push(...recentPosts);
	}

	return relatedPosts;
}
