/**
 * rehype-bilingual — wraps content between <!-- en --> / <!-- zh --> markers
 * into <div class="lang-en"> / <div class="lang-zh"> containers.
 *
 * Usage in markdown:
 *   <!-- en -->
 *   English content here...
 *
 *   <!-- zh -->
 *   中文内容在这里...
 *
 * If no markers found, content renders as-is (no wrapping).
 */

import type { Root, Element, RootContent } from "hast";
import type { Plugin } from "unified";

const rehypeBilingual: Plugin<[], Root> = () => {
	return (tree: Root) => {
		const children = tree.children;

		// Check if any <!-- en --> or <!-- zh --> comment exists
		const hasMarkers = children.some(
			(node) =>
				node.type === "comment" &&
				(node.value.trim() === "en" || node.value.trim() === "zh"),
		);

		if (!hasMarkers) return;

		const newChildren: RootContent[] = [];
		let currentLang: string | null = null;
		let currentGroup: RootContent[] = [];

		const flush = () => {
			if (currentLang && currentGroup.length > 0) {
				const wrapper: Element = {
					type: "element",
					tagName: "div",
					properties: { className: [`lang-${currentLang}`] },
					children: currentGroup as Element["children"],
				};
				newChildren.push(wrapper);
			} else {
				// Content before any marker — pass through
				newChildren.push(...currentGroup);
			}
			currentGroup = [];
		};

		for (const node of children) {
			if (
				node.type === "comment" &&
				(node.value.trim() === "en" || node.value.trim() === "zh")
			) {
				flush();
				currentLang = node.value.trim();
			} else {
				currentGroup.push(node);
			}
		}
		flush();

		tree.children = newChildren;
	};
};

export default rehypeBilingual;
