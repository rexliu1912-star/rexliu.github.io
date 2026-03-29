import { layout, prepare } from "@chenglou/pretext";
import { useEffect, useMemo, useState } from "react";

type BlockType = "paragraph" | "heading-2" | "heading-3" | "blockquote" | "list-item";

type SourceBlock = {
	id: string;
	type: BlockType;
	text: string;
	isDropCap?: boolean;
};

type MeasuredBlock = SourceBlock & {
	height: number;
};

type SectionItem =
	| { kind: "columns"; id: string; columns: MeasuredBlock[][] }
	| { kind: "full-width"; block: MeasuredBlock };

type Props = {
	sourceId: string;
};

const MAGAZINE_GAP = 32;
const LINE_HEIGHT_UNIT = 1.75;
const BRAND = "#8953d1";
const TYPE_SCALE: Record<BlockType, { size: number; weight?: number; extraSpacing: number }> = {
	paragraph: { size: 20, extraSpacing: 20 },
	"heading-2": { size: 28, weight: 700, extraSpacing: 28 },
	"heading-3": { size: 24, weight: 700, extraSpacing: 22 },
	blockquote: { size: 21, extraSpacing: 28 },
	"list-item": { size: 20, extraSpacing: 14 },
};

function getColumnCount(width: number) {
	return width >= 768 ? 2 : 1;
}

function getBlockFont(type: BlockType) {
	const config = TYPE_SCALE[type];
	return `${config.weight ? `${config.weight} ` : ""}${config.size}px Georgia, Cambria, \"Times New Roman\", Times, serif`;
}

function isBlockElement(node: Element): node is HTMLElement {
	return ["p", "h2", "h3", "blockquote", "li"].includes(node.tagName.toLowerCase());
}

function extractNodeText(node: HTMLElement) {
	return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function extractBlocks(root: HTMLElement): SourceBlock[] {
	const nodes = Array.from(root.querySelectorAll("p, h2, h3, blockquote, li")).filter(isBlockElement);
	const blocks: SourceBlock[] = [];
	let index = 0;
	let nextParagraphDropCap = true;

	for (const node of nodes) {
		if (node.closest("blockquote") && node.tagName.toLowerCase() === "p") {
			continue;
		}

		const text = extractNodeText(node);
		if (!text) continue;

		const tag = node.tagName.toLowerCase();
		const type: BlockType =
			tag === "h2"
				? "heading-2"
				: tag === "h3"
					? "heading-3"
					: tag === "blockquote"
						? "blockquote"
						: tag === "li"
							? "list-item"
							: "paragraph";

		const block: SourceBlock = {
			id: `${type}-${index++}`,
			type,
			text: tag === "li" ? `• ${text}` : text,
		};

		if (type === "heading-2") {
			nextParagraphDropCap = true;
		} else if (type === "paragraph" && nextParagraphDropCap) {
			block.isDropCap = true;
			nextParagraphDropCap = false;
		}

		blocks.push(block);
	}

	return blocks;
}

function measureBlock(block: SourceBlock, columnWidth: number): MeasuredBlock {
	const config = TYPE_SCALE[block.type];
	const lineHeight = config.size * LINE_HEIGHT_UNIT;
	const font = getBlockFont(block.type);
	const prepared = prepare(block.text, font);
	const measured = layout(prepared, columnWidth, lineHeight);
	const height = Math.max(measured.height, lineHeight) + config.extraSpacing;
	return { ...block, height };
}

function distributeBlocks(blocks: MeasuredBlock[], columns: number) {
	const buckets = Array.from({ length: columns }, () => [] as MeasuredBlock[]);
	if (blocks.length === 0) return buckets;

	// Greedy shortest-column algorithm: always put the next block into the shortest column
	const heights = new Array(columns).fill(0);

	for (const block of blocks) {
		// Find the column with minimum height
		let minCol = 0;
		for (let c = 1; c < columns; c++) {
			if (heights[c] < heights[minCol]) minCol = c;
		}
		buckets[minCol].push(block);
		heights[minCol] += block.height;
	}

	return buckets;
}

function buildSections(blocks: MeasuredBlock[], columns: number): SectionItem[] {
	const sections: SectionItem[] = [];
	let bucket: MeasuredBlock[] = [];
	let index = 0;

	const flushBucket = () => {
		if (bucket.length === 0) return;
		sections.push({
			kind: "columns",
			id: `columns-${index++}`,
			columns: distributeBlocks(bucket, columns),
		});
		bucket = [];
	};

	for (const block of blocks) {
		if (block.type === "heading-2" || block.type === "blockquote") {
			flushBucket();
			sections.push({ kind: "full-width", block });
			continue;
		}
		bucket.push(block);
	}

	flushBucket();
	return sections;
}

function splitDropCap(text: string) {
	const trimmed = text.trimStart();
	if (!trimmed) return null;
	const chars = Array.from(trimmed);
	const first = chars[0] ?? "";
	return { first, rest: chars.slice(1).join("") };
}

function useRevealAnimation(sectionCount: number) {
	useEffect(() => {
		if (!sectionCount || typeof window === "undefined") return;
		const root = document.getElementById("magazine-view-root");
		if (!root) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						(entry.target as HTMLElement).classList.add("is-visible");
						observer.unobserve(entry.target);
					}
				}
			},
			{ rootMargin: "200px 0px 200px 0px", threshold: 0.01 },
		);

		const nodes = root.querySelectorAll<HTMLElement>("[data-magazine-reveal]");
		const fallbackTimer = window.setTimeout(() => {
			for (const node of nodes) {
				node.classList.add("is-visible");
			}
		}, 450);

		for (const node of nodes) {
			if (!node.classList.contains("is-visible")) {
				observer.observe(node);
			}
		}

		return () => {
			window.clearTimeout(fallbackTimer);
			observer.disconnect();
		};
	}, [sectionCount]);
}

export default function MagazineView({ sourceId }: Props) {
	const [blocks, setBlocks] = useState<SourceBlock[]>([]);
	const [containerWidth, setContainerWidth] = useState(0);

	useEffect(() => {
		const source = document.getElementById(sourceId);
		if (!source) return;

		const updateBlocks = () => setBlocks(extractBlocks(source));
		updateBlocks();

		const mutationObserver = new MutationObserver(updateBlocks);
		mutationObserver.observe(source, { childList: true, subtree: true, characterData: true });

		return () => mutationObserver.disconnect();
	}, [sourceId]);

	useEffect(() => {
		const root = document.getElementById("magazine-view-root");
		if (!root) return;

		const updateSize = () => setContainerWidth(root.getBoundingClientRect().width);
		updateSize();

		const resizeObserver = new ResizeObserver(updateSize);
		resizeObserver.observe(root);
		window.addEventListener("resize", updateSize);
		window.addEventListener("magazine-view:refresh", updateSize as EventListener);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", updateSize);
			window.removeEventListener("magazine-view:refresh", updateSize as EventListener);
		};
	}, []);

	const columns = useMemo(() => getColumnCount(containerWidth), [containerWidth]);
	const columnWidth = useMemo(() => {
		if (containerWidth <= 0) return 0;
		return Math.max((containerWidth - MAGAZINE_GAP * (columns - 1)) / columns, 260);
	}, [columns, containerWidth]);

	const sections = useMemo(() => {
		if (!columnWidth || blocks.length === 0) return [] as SectionItem[];
		const measuredBlocks = blocks.map((block) => measureBlock(block, columnWidth));
		return buildSections(measuredBlocks, columns);
	}, [blocks, columnWidth, columns]);

	useRevealAnimation(sections.length);

	// Notify reading progress bar that layout changed
	useEffect(() => {
		window.dispatchEvent(new Event("resize"));
	}, [sections]);

	return (
		<>
			<div id="magazine-view-root" className="magazine-view-root text-[rgba(17,24,39,0.94)] dark:text-[rgba(243,244,246,0.92)]">
				{sections.map((section) => {
					if (section.kind === "full-width") {
						const block = section.block;
						if (block.type === "heading-2") {
							return (
								<h2
									key={block.id}
									data-magazine-reveal
									className="magazine-reveal mb-7 mt-10 border-t border-[#8953d1]/20 pt-7 font-serif text-[28px] leading-[1.25] font-bold text-black dark:border-[#a175e8]/25 dark:text-white"
								>
									{block.text}
								</h2>
							);
						}

						return (
							<blockquote
								key={block.id}
								data-magazine-reveal
								className="magazine-reveal mb-8 border-l-4 border-[#8953d1] bg-[rgba(137,83,209,0.05)] px-5 py-4 font-serif text-[21px] leading-[1.8] italic text-gray-700 dark:bg-[rgba(137,83,209,0.12)] dark:text-gray-200"
							>
								{block.text}
							</blockquote>
						);
					}

					return (
						<div
							key={section.id}
							className="magazine-columns-grid mb-8 grid gap-8"
							style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
						>
							{section.columns.map((column, columnIndex) => (
								<div
									key={`${section.id}-column-${columnIndex}`}
									className="min-w-0"
									style={{
										paddingLeft: columnIndex === 0 ? 0 : MAGAZINE_GAP / 2,
										paddingRight: columnIndex === columns - 1 ? 0 : MAGAZINE_GAP / 2,
										borderLeft: columnIndex === 0 || columns === 1 ? "none" : "1px solid rgba(137, 83, 209, 0.24)",
									}}
								>
									{column.map((block) => {
										const dropCap = block.isDropCap ? splitDropCap(block.text) : null;
										const commonClassName = [
											"magazine-reveal font-serif",
											block.type === "paragraph" ? "text-[20px] leading-[1.75]" : "",
											block.type === "heading-3" ? "text-[24px] leading-[1.4] font-bold text-black dark:text-white" : "",
											block.type === "list-item" ? "text-[20px] leading-[1.75]" : "",
										].filter(Boolean).join(" ");

										return (
											<div key={block.id} style={{ marginBottom: TYPE_SCALE[block.type].extraSpacing }}>
												{block.type === "heading-3" ? (
													<h3 data-magazine-reveal className={commonClassName}>
														{block.text}
													</h3>
												) : (
													<p data-magazine-reveal className={commonClassName}>
														{dropCap ? (
															<>
																<span className="magazine-dropcap-letter">{dropCap.first}</span>
																{dropCap.rest}
															</>
														) : (
															block.text
														)}
													</p>
												)}
											</div>
										);
									})}
								</div>
							))}
						</div>
					);
				})}
			</div>

			<style>{`
				.magazine-view-root {
					font-family: Georgia, Cambria, "Times New Roman", Times, serif;
				}

				.magazine-reveal {
					opacity: 0;
					transform: translateY(12px);
					transition: opacity 0.4s ease, transform 0.4s ease;
					will-change: opacity, transform;
				}

				.magazine-reveal.is-visible {
					opacity: 1;
					transform: translateY(0);
				}

				.magazine-dropcap-letter {
					float: left;
					font-size: 3.8em;
					line-height: 0.8;
					font-weight: 700;
					color: ${BRAND};
					margin: 0.1em 0.12em 0 0;
				}

				@media (prefers-reduced-motion: reduce) {
					.magazine-reveal {
						opacity: 1;
						transform: none;
						transition: none;
					}
				}
			`}</style>
		</>
	);
}
