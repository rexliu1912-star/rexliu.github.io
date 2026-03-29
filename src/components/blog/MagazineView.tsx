import { layout, layoutNextLine, prepare, prepareWithSegments } from "@chenglou/pretext";
import { useEffect, useMemo, useState } from "react";

type BlockType = "paragraph" | "heading-2" | "heading-3" | "blockquote" | "list-item";

type SourceBlock = {
	id: string;
	type: BlockType;
	text: string;
};

type RenderBlock = SourceBlock & {
	lines: string[];
	height: number;
};

type Props = {
	sourceId: string;
};

const MAGAZINE_GAP = 32;
const LINE_HEIGHT_UNIT = 1.75;
const TYPE_SCALE: Record<BlockType, { size: number; weight?: number; extraSpacing: number }> = {
	paragraph: { size: 20, extraSpacing: 16 },
	"heading-2": { size: 28, weight: 700, extraSpacing: 24 },
	"heading-3": { size: 24, weight: 700, extraSpacing: 20 },
	blockquote: { size: 21, extraSpacing: 24 },
	"list-item": { size: 20, extraSpacing: 12 },
};

function getColumnCount(width: number) {
	if (width >= 1200) return 3;
	if (width >= 768) return 2;
	return 1;
}

function getBlockFont(type: BlockType) {
	const config = TYPE_SCALE[type];
	return `${config.weight ? `${config.weight} ` : ""}${config.size}px Georgia, Cambria, \"Times New Roman\", Times, serif`;
}

function extractBlocks(root: HTMLElement): SourceBlock[] {
	const nodes = Array.from(root.querySelectorAll("p, h2, h3, blockquote, li"));
	const blocks: SourceBlock[] = [];
	let index = 0;

	for (const node of nodes) {
		const text = node.textContent?.replace(/\s+/g, " ").trim();
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

		blocks.push({
			id: `${type}-${index++}`,
			type,
			text: tag === "li" ? `• ${text}` : text,
		});
	}

	return blocks;
}

function layoutBlock(block: SourceBlock, columnWidth: number): RenderBlock {
	const config = TYPE_SCALE[block.type];
	const lineHeight = config.size * LINE_HEIGHT_UNIT;
	const font = getBlockFont(block.type);

	// prepare() gives us cheap height math; prepareWithSegments() drives per-line DOM rendering.
	const prepared = prepare(block.text, font);
	const segmented = prepareWithSegments(block.text, font);
	const baseline = layout(prepared, columnWidth, lineHeight);
	const result: string[] = [];

	let cursor = { segmentIndex: 0, graphemeIndex: 0 };
	while (true) {
		const line = layoutNextLine(segmented, cursor, columnWidth);
		if (line === null) break;
		result.push(line.text);
		cursor = line.end;
	}

	const measuredLineCount = result.length > 0 ? result.length : baseline.lineCount;
	const height = Math.max(measuredLineCount, 1) * lineHeight + config.extraSpacing;
	return {
		...block,
		lines: result,
		height,
	};
}

function distributeBlocks(blocks: RenderBlock[], columns: number) {
	const buckets = Array.from({ length: columns }, () => [] as RenderBlock[]);
	if (blocks.length === 0) return buckets;

	const totalHeight = blocks.reduce((sum, block) => sum + block.height, 0);
	const targetHeight = totalHeight / columns;
	let currentColumn = 0;
	let currentHeight = 0;

	for (const block of blocks) {
		if (
			currentColumn < columns - 1 &&
			currentHeight > 0 &&
			currentHeight + block.height > targetHeight
		) {
			currentColumn += 1;
			currentHeight = 0;
		}

		buckets[currentColumn]?.push(block);
		currentHeight += block.height;
	}

	return buckets;
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

		const resizeObserver = new ResizeObserver(() => updateSize());
		resizeObserver.observe(root);
		window.addEventListener("resize", updateSize);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", updateSize);
		};
	}, []);

	const columns = useMemo(() => getColumnCount(containerWidth), [containerWidth]);
	const columnWidth = useMemo(() => {
		if (containerWidth <= 0) return 0;
		return Math.max((containerWidth - MAGAZINE_GAP * (columns - 1)) / columns, 240);
	}, [columns, containerWidth]);

	const layoutColumns = useMemo(() => {
		if (!columnWidth || blocks.length === 0) return Array.from({ length: columns }, () => [] as RenderBlock[]);
		const renderedBlocks = blocks.map((block) => layoutBlock(block, columnWidth));
		return distributeBlocks(renderedBlocks, columns);
	}, [blocks, columnWidth, columns]);

	return (
		<div
			id="magazine-view-root"
			className="grid gap-8 text-[rgba(17,24,39,0.94)] dark:text-[rgba(243,244,246,0.92)]"
			style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
		>
			{layoutColumns.map((column, columnIndex) => (
				<div
					key={`column-${columnIndex}`}
					className="min-w-0"
					style={{
						paddingLeft: columnIndex === 0 ? 0 : MAGAZINE_GAP / 2,
						paddingRight: columnIndex === columns - 1 ? 0 : MAGAZINE_GAP / 2,
						borderLeft:
							columnIndex === 0 ? "none" : "1px solid rgba(137, 83, 209, 0.3)",
					}}
				>
					{column.map((block, blockIndex) => (
						<div
							key={block.id}
							className={[
								"font-serif",
								block.type === "paragraph" ? "text-[20px] leading-[1.75]" : "",
								block.type === "heading-2"
									? "text-[28px] leading-[1.35] font-bold text-black dark:text-white"
									: "",
								block.type === "heading-3"
									? "text-[24px] leading-[1.4] font-bold text-black dark:text-white"
									: "",
								block.type === "blockquote"
									? "border-l-2 border-[#8953d1]/40 pl-4 italic text-[21px] leading-[1.75] text-gray-700 dark:text-gray-300"
									: "",
								block.type === "list-item" ? "text-[20px] leading-[1.75]" : "",
								blockIndex === 0 && columnIndex === 0 && block.type === "paragraph"
									? "magazine-dropcap"
									: "",
							]
								.filter(Boolean)
								.join(" ")}
							style={{ marginBottom: TYPE_SCALE[block.type].extraSpacing }}
						>
							{block.lines.map((line, lineIndex) => (
								<div key={`${block.id}-${lineIndex}`}>
									{blockIndex === 0 && columnIndex === 0 && lineIndex === 0 && block.type === "paragraph" && line.length > 0
										? <>
											<span style={{
												float: 'left',
												fontSize: '3.8em',
												lineHeight: '0.8',
												fontWeight: 700,
												color: '#8953d1',
												margin: '0.1em 0.12em 0 0',
											}}>{line[0]}</span>
											{line.slice(1)}
										</>
										: line}
								</div>
							))}
						</div>
					))}
				</div>
			))}
		</div>
	);
}
