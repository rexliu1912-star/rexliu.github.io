/**
 * remark-bilingual — wraps content between <!-- en --> / <!-- zh --> markers
 * into <div class="lang-en"> / <div class="lang-zh"> containers.
 */

import type { Root, RootContent } from "mdast";

export function remarkBilingual() {
	return (tree: Root) => {
		const children = tree.children;

		const hasMarkers = children.some(
			(node) =>
				node.type === "html" &&
				/^<!--\s*(en|zh)\s*-->$/.test(node.value.trim()),
		);

		if (!hasMarkers) return;

		const newChildren: RootContent[] = [];
		let currentLang: string | null = null;
		let currentGroup: RootContent[] = [];

		const flush = () => {
			if (currentLang && currentGroup.length > 0) {
				newChildren.push(
					{ type: "html", value: `<div class="lang-${currentLang}">` },
					...currentGroup,
					{ type: "html", value: `</div>` },
				);
			} else {
				newChildren.push(...currentGroup);
			}
			currentGroup = [];
		};

		for (const node of children) {
			if (
				node.type === "html" &&
				/^<!--\s*(en|zh)\s*-->$/.test(node.value.trim())
			) {
				flush();
				const match = node.value.trim().match(/^<!--\s*(en|zh)\s*-->$/);
				currentLang = match ? match[1]! : null;
			} else {
				currentGroup.push(node);
			}
		}
		flush();

		tree.children = newChildren;
	};
}
