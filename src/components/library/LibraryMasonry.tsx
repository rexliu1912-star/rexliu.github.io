import { layout, prepare } from "@chenglou/pretext";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

type BookNotes = {
	quotes?: string[];
	core_ideas?: string[];
	impact?: string;
};

export type MasonryItem = {
	id: string;
	title: string;
	titleEn: string | undefined;
	subtitle: string; // author for books, "Film · 2023" etc for media
	cover: string | undefined;
	coverClass: string;
	rating: string | null | undefined;
	tags: string[];
	sortDate: string | undefined; // ISO date or year string
	sortYear: number | undefined; // for media (fallback when no sortDate)
	notes: BookNotes | undefined;
	reviewSlug: string | undefined;
	hasNotes: boolean;
};

type SortBy = "date" | "rating" | "notes";

type Props = {
	items: MasonryItem[];
	scope: string; // "books" | "films" | "series" — used to scope filter/sort events
	initialSortBy?: SortBy;
	initialTagFilter?: string | null;
};

const BRAND = "#8953d1";
const COVER_ASPECT = 1.5;
const PREVIEW_LIMIT = 120;

// Container-width → column count (not viewport width — the page has a max-width wrapper)
function getColumns(width: number): number {
	if (width < 500) return 1;
	if (width < 780) return 2;
	if (width < 1100) return 3;
	return 4;
}

// Column gap per layout (px)
function getGap(columns: number): number {
	if (columns <= 1) return 16;
	if (columns === 2) return 20;
	return 24;
}

function truncate(s: string, n: number): string {
	return s.length > n ? `${s.slice(0, n)}…` : s;
}

function getPreview(notes?: BookNotes): string {
	if (!notes) return "";
	if (notes.quotes?.[0]) return truncate(notes.quotes[0], PREVIEW_LIMIT);
	if (notes.core_ideas?.[0]) return truncate(notes.core_ideas[0], 100);
	if (notes.impact) return truncate(notes.impact, 100);
	return "";
}

function ratingDots(rating: string | null | undefined): number {
	if (!rating) return 0;
	const m = rating.match(/^(\d+(?:\.\d+)?)\/(\d+)/);
	if (m?.[1] && m[2]) {
		return Math.round((Number.parseFloat(m[1]) / Number.parseFloat(m[2])) * 5);
	}
	const full = (rating.match(/🌕/g) || []).length;
	const half = (rating.match(/🌗/g) || []).length;
	return Math.min(5, Math.round(full + half * 0.5));
}

type MeasuredItem = MasonryItem & { _height: number; _preview: string };

function measureItem(item: MasonryItem, columnWidth: number): MeasuredItem {
	const padding = 14;
	const innerWidth = Math.max(columnWidth - padding * 2, 120);
	const preview = getPreview(item.notes);
	const rDots = ratingDots(item.rating);

	// Cover (2:3) spans full column width
	let h = columnWidth * COVER_ASPECT;

	// Body top padding
	h += 12;

	// Title — Pretext-measured (handles 1-line or multi-line titles accurately)
	const titlePrepared = prepare(
		item.title,
		'500 16px Georgia, Cambria, "Times New Roman", Times, serif',
	);
	const titleLayout = layout(titlePrepared, innerWidth, 20);
	h += titleLayout.height;

	// titleEn (optional, usually 1 line)
	if (item.titleEn) h += 15 + 2;

	// Meta row: subtitle + date
	h += 14 + 4;

	// Rating dots
	if (item.rating && rDots > 0) h += 10 + 4;

	// Notes preview — Pretext-measured
	if (preview) {
		const quotePrepared = prepare(
			preview,
			'14px Georgia, Cambria, "Times New Roman", Times, serif',
		);
		const quoteLayout = layout(quotePrepared, innerWidth - 12 /* border-left + padding */, 24);
		h += 12 /* margin */ + quoteLayout.height + 2 /* line-height buffer */;
	}

	// Tags row (single line, pill style)
	if (item.tags.length > 0) h += 10 + 22;

	// Body bottom padding
	h += 14;

	return { ...item, _height: h, _preview: preview };
}

function distributeColumns(items: MeasuredItem[], columns: number): MeasuredItem[][] {
	const buckets: MeasuredItem[][] = Array.from({ length: columns }, () => []);
	const heights = new Array(columns).fill(0);
	for (const item of items) {
		let minCol = 0;
		for (let c = 1; c < columns; c++) {
			if (heights[c] < heights[minCol]) minCol = c;
		}
		buckets[minCol]?.push(item);
		heights[minCol] += item._height;
	}
	return buckets;
}

function useRevealAnimation(rootRef: RefObject<HTMLDivElement | null>, signature: string) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: signature is the intentional trigger — re-run when layout changes
	useEffect(() => {
		if (typeof window === "undefined") return;
		const root = rootRef.current;
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

		const nodes = root.querySelectorAll<HTMLElement>("[data-masonry-reveal]");
		const fallback = window.setTimeout(() => {
			for (const node of nodes) node.classList.add("is-visible");
		}, 600);

		for (const node of nodes) {
			if (!node.classList.contains("is-visible")) observer.observe(node);
		}

		return () => {
			window.clearTimeout(fallback);
			observer.disconnect();
		};
	}, [signature, rootRef]);
}

export default function LibraryMasonry({
	items,
	scope,
	initialSortBy = "date",
	initialTagFilter = null,
}: Props) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(0);
	const [activeTagFilter, setActiveTagFilter] = useState<string | null>(initialTagFilter);
	const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);

	// Listen to filter/sort events scoped to this masonry (books / films / series)
	useEffect(() => {
		const tagEvent = `library:${scope}:tag-filter`;
		const sortEvent = `library:${scope}:sort-change`;
		const handleTag = (e: Event) => {
			const detail = (e as CustomEvent<{ tag: string | null }>).detail;
			setActiveTagFilter(detail?.tag ?? null);
		};
		const handleSort = (e: Event) => {
			const detail = (e as CustomEvent<{ sortBy: SortBy }>).detail;
			if (detail?.sortBy) setSortBy(detail.sortBy);
		};
		window.addEventListener(tagEvent, handleTag);
		window.addEventListener(sortEvent, handleSort);
		return () => {
			window.removeEventListener(tagEvent, handleTag);
			window.removeEventListener(sortEvent, handleSort);
		};
	}, [scope]);

	// Resize observer
	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const update = () => setContainerWidth(el.getBoundingClientRect().width);
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		window.addEventListener("resize", update);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", update);
		};
	}, []);

	// Filter + sort
	const filtered = useMemo(() => {
		let list = items;
		if (activeTagFilter) {
			list = list.filter((b) => b.tags.includes(activeTagFilter));
		}
		const sorted = [...list];
		if (sortBy === "date") {
			sorted.sort((a, b) => {
				// Prefer sortDate; fallback to sortYear (for media)
				const av = a.sortDate ? new Date(a.sortDate).valueOf() : a.sortYear ?? 0;
				const bv = b.sortDate ? new Date(b.sortDate).valueOf() : b.sortYear ?? 0;
				if (!av && !bv) return 0;
				if (!av) return 1;
				if (!bv) return -1;
				return bv - av;
			});
		} else if (sortBy === "rating") {
			sorted.sort((a, b) => ratingDots(b.rating) - ratingDots(a.rating));
		} else if (sortBy === "notes") {
			sorted.sort((a, b) => Number(b.hasNotes) - Number(a.hasNotes));
		}
		return sorted;
	}, [items, activeTagFilter, sortBy]);

	const columns = useMemo(() => getColumns(containerWidth), [containerWidth]);
	const gap = useMemo(() => getGap(columns), [columns]);
	const columnWidth = useMemo(() => {
		if (containerWidth <= 0) return 0;
		return Math.max((containerWidth - gap * (columns - 1)) / columns, 240);
	}, [containerWidth, columns, gap]);

	const buckets = useMemo(() => {
		if (!columnWidth || filtered.length === 0) return [] as MeasuredItem[][];
		const measured = filtered.map((b) => measureItem(b, columnWidth));
		return distributeColumns(measured, columns);
	}, [filtered, columnWidth, columns]);

	// Signature for reveal animation effect
	const signature = `${scope}-${filtered.length}-${columns}-${sortBy}-${activeTagFilter ?? ""}`;
	useRevealAnimation(rootRef, signature);

	return (
		<div ref={rootRef} className="library-masonry-root" style={{ minHeight: 200 }}>
			{columnWidth > 0 && (
				<div
					className="library-masonry-grid"
					style={{
						display: "grid",
						gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
						gap: `${gap}px`,
						alignItems: "start",
					}}
				>
					{buckets.map((bucket, ci) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: columns are order-stable
							key={`col-${ci}`}
							className="library-masonry-col"
							style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, minWidth: 0 }}
						>
							{bucket.map((item) => (
								<MasonryCard key={item.id} item={item} />
							))}
						</div>
					))}
				</div>
			)}

			{columnWidth > 0 && filtered.length === 0 && (
				<div className="library-masonry-empty">
					<span className="lang-en">No items match the current filter.</span>
					<span className="lang-zh">当前筛选下暂无内容。</span>
				</div>
			)}

			<style>{`
				.library-masonry-card {
					background: rgba(255, 250, 239, 0.55);
					border-radius: 12px;
					overflow: hidden;
					text-decoration: none;
					display: block;
					color: inherit;
					transition: transform 0.25s ease, box-shadow 0.25s ease;
					box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
				}
				:root.dark .library-masonry-card,
				[data-theme="dark"] .library-masonry-card {
					background: rgba(24, 24, 24, 0.6);
					box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
				}
				.library-masonry-card.clickable {
					cursor: pointer;
				}
				.library-masonry-card.clickable:hover {
					transform: translateY(-3px);
					box-shadow: 0 12px 28px rgba(137, 83, 209, 0.18);
				}
				.library-masonry-card.clickable:hover .library-masonry-cover-img {
					transform: scale(1.03);
				}
				.library-masonry-cover-wrap {
					aspect-ratio: 2/3;
					overflow: hidden;
					background: rgba(137, 83, 209, 0.05);
				}
				.library-masonry-cover-img {
					width: 100%;
					height: 100%;
					object-fit: cover;
					object-position: center;
					display: block;
					transition: transform 0.5s ease;
				}
				.library-masonry-cover-fallback {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 100%;
					height: 100%;
					padding: 12px;
					text-align: center;
				}
				.library-masonry-cover-fallback span {
					font-family: Georgia, Cambria, "Times New Roman", Times, serif;
					font-size: 13px;
					font-weight: 600;
					color: white;
					line-height: 1.3;
					text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
				}
				.library-masonry-body {
					padding: 12px 14px 14px;
				}
				.library-masonry-title {
					font-family: Georgia, Cambria, "Times New Roman", Times, serif;
					font-size: 16px;
					font-weight: 500;
					line-height: 1.25;
					color: rgba(17, 24, 39, 0.94);
					margin: 0;
				}
				:root.dark .library-masonry-title,
				[data-theme="dark"] .library-masonry-title {
					color: rgba(243, 244, 246, 0.95);
				}
				.library-masonry-titleEn {
					font-family: Georgia, serif;
					font-style: italic;
					font-size: 12px;
					color: rgb(107, 114, 128);
					margin: 2px 0 0;
				}
				.library-masonry-meta {
					font-family: Georgia, serif;
					font-size: 11px;
					color: rgb(156, 163, 175);
					margin: 4px 0 0;
					line-height: 1.4;
				}
				.library-masonry-rating {
					display: flex;
					gap: 3px;
					margin-top: 4px;
				}
				.library-masonry-rating-dot {
					width: 6px;
					height: 6px;
					border-radius: 50%;
					background: rgb(229, 231, 235);
					display: block;
				}
				:root.dark .library-masonry-rating-dot,
				[data-theme="dark"] .library-masonry-rating-dot {
					background: rgb(55, 65, 81);
				}
				.library-masonry-rating-dot.filled {
					background: ${BRAND};
				}
				:root.dark .library-masonry-rating-dot.filled,
				[data-theme="dark"] .library-masonry-rating-dot.filled {
					background: #a175e8;
				}
				.library-masonry-quote {
					border-left: 3px solid ${BRAND};
					padding-left: 10px;
					margin: 12px 0 0;
					font-family: Georgia, Cambria, "Times New Roman", Times, serif;
					font-size: 14px;
					line-height: 1.7;
					color: rgba(75, 85, 99, 0.92);
					font-style: normal;
				}
				:root.dark .library-masonry-quote,
				[data-theme="dark"] .library-masonry-quote {
					border-left-color: #a175e8;
					color: rgba(209, 213, 219, 0.9);
				}
				.library-masonry-tags {
					margin-top: 10px;
					display: flex;
					flex-wrap: wrap;
					gap: 4px;
				}
				.library-masonry-tag {
					font-family: Georgia, serif;
					font-size: 10px;
					color: rgb(107, 114, 128);
					background: rgba(137, 83, 209, 0.08);
					padding: 3px 7px;
					border-radius: 4px;
					line-height: 1.3;
				}
				:root.dark .library-masonry-tag,
				[data-theme="dark"] .library-masonry-tag {
					color: rgb(156, 163, 175);
					background: rgba(161, 117, 232, 0.15);
				}
				.library-masonry-empty {
					padding: 40px 20px;
					text-align: center;
					font-family: Georgia, serif;
					font-size: 14px;
					color: rgb(156, 163, 175);
				}
				[data-masonry-reveal] {
					opacity: 0;
					transform: translateY(8px);
					transition: opacity 0.4s ease, transform 0.4s ease;
					will-change: opacity, transform;
				}
				[data-masonry-reveal].is-visible {
					opacity: 1;
					transform: translateY(0);
				}
				@media (prefers-reduced-motion: reduce) {
					[data-masonry-reveal] {
						opacity: 1;
						transform: none;
						transition: none;
					}
					.library-masonry-card,
					.library-masonry-cover-img {
						transition: none !important;
					}
				}
			`}</style>
		</div>
	);
}

function MasonryCard({ item }: { item: MeasuredItem }) {
	const dots = ratingDots(item.rating);

	return (
		<article
			className="library-masonry-card clickable"
			data-masonry-reveal
			data-id={item.id}
			data-tags={JSON.stringify(item.tags)}
		>
			<div className="library-masonry-cover-wrap">
				{item.cover ? (
					<img
						src={item.cover}
						alt=""
						className="library-masonry-cover-img"
						loading="lazy"
						referrerPolicy="no-referrer"
					/>
				) : (
					<div className={`library-masonry-cover-fallback ${item.coverClass}`}>
						<span>{item.title}</span>
					</div>
				)}
			</div>
			<div className="library-masonry-body">
				<h3 className="library-masonry-title">{item.title}</h3>
				{item.titleEn && <p className="library-masonry-titleEn">{item.titleEn}</p>}
				<p className="library-masonry-meta">
					{item.subtitle}
					{item.sortDate && <span> · {item.sortDate}</span>}
				</p>
				{item.rating && dots > 0 && (
					<div className="library-masonry-rating" role="img" aria-label={`rating ${dots} of 5`}>
						{[1, 2, 3, 4, 5].map((n) => (
							<span key={n} className={`library-masonry-rating-dot ${dots >= n ? "filled" : ""}`} />
						))}
					</div>
				)}
				{item._preview && (
					<blockquote className="library-masonry-quote">{item._preview}</blockquote>
				)}
				{item.tags.length > 0 && (
					<div className="library-masonry-tags">
						{item.tags.map((t) => (
							<span key={t} className="library-masonry-tag">
								{t}
							</span>
						))}
					</div>
				)}
			</div>
		</article>
	);
}
