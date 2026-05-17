import { layout, prepare } from "@chenglou/pretext";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

type BookNotes = {
	quotes?: string[];
	core_ideas?: string[];
	impact?: string;
};

type WeReadThought = {
	id?: string;
	content: string;
	chapter?: string;
	createdAt?: string;
	rating?: number;
};

type WeReadProgress = {
	percent?: number;
	chapterName?: string;
	updatedAt?: string;
	isFinished?: boolean;
};

type WeReadMeta = {
	bookId?: string;
	category?: string;
	finishReading?: boolean;
	lastReadDate?: string;
	rankedReadTime?: string;
	badges?: string[];
	currentlyReading?: boolean;
	progress?: WeReadProgress;
	thoughts?: WeReadThought[];
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
	weread?: WeReadMeta | undefined;
};

type SortBy = "date" | "rating" | "notes";

type Props = {
	items: MasonryItem[];
	scope: string; // "books" | "films" | "series" — used to scope filter/sort events
	initialSortBy?: SortBy;
	initialTagFilter?: string | null;
};

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

function getPreview(notes?: BookNotes, thoughts?: WeReadThought[]): string {
	if (notes?.quotes?.[0]) return truncate(notes.quotes[0], PREVIEW_LIMIT);
	if (notes?.core_ideas?.[0]) return truncate(notes.core_ideas[0], 100);
	if (notes?.impact) return truncate(notes.impact, 100);
	if (thoughts?.[0]?.content) return truncate(thoughts[0].content, PREVIEW_LIMIT);
	return "";
}

const zhCategoryMap: Record<string, string> = {
	小说: "Fiction",
	社会小说: "Social Fiction",
	悬疑推理: "Mystery & Detective",
	文学: "Literature",
	散文杂著: "Essays",
	历史: "History",
	人物传记: "Biography",
	传记: "Biography",
	哲学宗教: "Philosophy",
	哲学: "Philosophy",
	宗教: "Religion",
	社会文化: "Society & Culture",
	社会: "Society",
	文化: "Culture",
	政治军事: "Politics & Military",
	经济理财: "Economics & Finance",
	经济: "Economics",
	理财: "Finance",
	商业: "Business",
	管理: "Management",
	个人成长: "Personal Growth",
	心理: "Psychology",
	科技互联网: "Tech & Internet",
	艺术: "Art",
	教育: "Education",
	生活百科: "Lifestyle",
};

function translateZhCategory(value = "") {
	return value
		.split(/[-/·]/)
		.map((part) => zhCategoryMap[part.trim()] || part.trim())
		.filter(Boolean)
		.join(" / ");
}

function translateDuration(value = "") {
	return value
		.replace(/(\d+)\s*时/g, "$1h")
		.replace(/(\d+)\s*分/g, "$1m")
		.replace(/(\d+)\s*小时/g, "$1h")
		.replace(/(\d+)\s*分钟/g, "$1m")
		.replace(/(\d+)\s*天/g, "$1d")
		.replace(/(\d+)\s*秒/g, "$1s");
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
	const preview = getPreview(item.notes, item.weread?.thoughts);
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

	// WeRead source/status line
	if (item.weread?.bookId) h += 16 + 3;

	// Reading progress pill/bar
	if (item.weread?.progress?.percent !== undefined) h += 24;

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
				const av = a.sortDate ? new Date(a.sortDate).valueOf() : (a.sortYear ?? 0);
				const bv = b.sortDate ? new Date(b.sortDate).valueOf() : (b.sortYear ?? 0);
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
				.library-masonry-root {
					--library-accent: var(--color-quote);
					--library-text: var(--color-global-text);
					--library-muted: var(--color-gray-500, #666);
					--library-faint: var(--color-gray-400, #888);
					--library-card-bg: color-mix(in oklab, var(--color-global-bg) 82%, white 18%);
					--library-card-border: color-mix(in oklab, var(--color-accent) 18%, transparent);
					--library-card-shadow: color-mix(in oklab, var(--color-global-text) 9%, transparent);
					--library-accent-soft: color-mix(in oklab, var(--library-accent) 13%, transparent);
				}
				html[data-theme="dark"] .library-masonry-root {
					--library-card-bg: color-mix(in oklab, var(--color-global-bg) 88%, white 12%);
					--library-card-border: color-mix(in oklab, var(--color-quote) 18%, transparent);
					--library-card-shadow: rgba(0, 0, 0, 0.3);
				}
				html[data-mood="rainy"] .library-masonry-root {
					--library-card-bg: color-mix(in oklab, var(--color-global-bg) 82%, white 18%);
					--library-card-border: color-mix(in oklab, var(--color-accent) 20%, transparent);
					--library-card-shadow: rgba(45, 55, 72, 0.1);
				}
				.library-masonry-card {
					background: var(--library-card-bg);
					border: 1px solid var(--library-card-border);
					border-radius: 12px;
					overflow: hidden;
					text-decoration: none;
					display: block;
					color: inherit;
					transition: transform 0.25s ease, box-shadow 0.25s ease;
					box-shadow: 0 1px 2px var(--library-card-shadow);
				}
				.library-masonry-card.clickable {
					cursor: pointer;
				}
				.library-masonry-card.clickable:hover {
					transform: translateY(-3px);
					box-shadow: 0 12px 28px color-mix(in oklab, var(--library-accent) 22%, transparent);
				}
				.library-masonry-card.clickable:hover .library-masonry-cover-img {
					transform: scale(1.03);
				}
				.library-masonry-cover-wrap {
					aspect-ratio: 2/3;
					overflow: hidden;
					background: var(--library-accent-soft);
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
					color: var(--library-text);
					margin: 0;
				}
				.library-masonry-titleEn {
					font-family: Georgia, serif;
					font-style: italic;
					font-size: 12px;
					color: var(--library-muted);
					margin: 2px 0 0;
				}
				.library-masonry-meta {
					font-family: Georgia, serif;
					font-size: 11px;
					color: var(--library-faint);
					margin: 4px 0 0;
					line-height: 1.4;
				}
				.library-masonry-weread {
					margin: 5px 0 0;
					font-family: Georgia, Cambria, "Times New Roman", Times, serif;
					font-size: 11px;
					line-height: 1.35;
					color: var(--library-accent);
				}
				.library-masonry-progress {
					margin-top: 7px;
					display: grid;
					gap: 4px;
				}
				.library-masonry-progress-track {
					height: 3px;
					overflow: hidden;
					border-radius: 999px;
					background: var(--library-accent-soft);
				}
				.library-masonry-progress-fill {
					display: block;
					height: 100%;
					border-radius: inherit;
					background: var(--library-accent);
				}
				.library-masonry-progress-copy {
					font-family: Georgia, Cambria, "Times New Roman", Times, serif;
					font-size: 10px;
					line-height: 1.3;
					color: var(--library-muted);
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
					background: color-mix(in oklab, var(--library-muted) 25%, transparent);
					display: block;
				}
				.library-masonry-rating-dot.filled {
					background: var(--library-accent);
				}
				.library-masonry-quote {
					border-left: 3px solid var(--library-accent);
					padding-left: 10px;
					margin: 12px 0 0;
					font-family: Georgia, Cambria, "Times New Roman", Times, serif;
					font-size: 14px;
					line-height: 1.7;
					color: var(--library-muted);
					font-style: normal;
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
					color: var(--library-muted);
					background: var(--library-accent-soft);
					padding: 3px 7px;
					border-radius: 4px;
					line-height: 1.3;
				}
				.library-masonry-empty {
					padding: 40px 20px;
					text-align: center;
					font-family: Georgia, serif;
					font-size: 14px;
					color: var(--library-faint);
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
	const wereadBitsZh = [
		item.weread?.finishReading ? "读完" : item.weread?.bookId ? "在读" : "",
		item.weread?.category,
		item.weread?.rankedReadTime,
	].filter(Boolean);
	const wereadBitsEn = [
		item.weread?.finishReading ? "Finished" : item.weread?.bookId ? "Reading" : "",
		item.weread?.category ? translateZhCategory(item.weread.category) : "",
		item.weread?.rankedReadTime ? translateDuration(item.weread.rankedReadTime) : "",
	].filter(Boolean);
	const progressPercent = Math.max(
		0,
		Math.min(100, Math.round(Number(item.weread?.progress?.percent ?? 0))),
	);

	return (
		<article
			className="library-masonry-card clickable"
			data-masonry-reveal
			data-id={item.id}
			data-tags={JSON.stringify(item.tags)}
		>
			<div className="library-masonry-cover-wrap">
				<MasonryCover item={item} />
			</div>
			<div className="library-masonry-body">
				<h3 className="library-masonry-title">{item.title}</h3>
				{item.titleEn && <p className="library-masonry-titleEn">{item.titleEn}</p>}
				<p className="library-masonry-meta">
					{item.subtitle}
					{item.sortDate && <span> · {item.sortDate}</span>}
				</p>
				{wereadBitsZh.length > 0 && (
					<p className="library-masonry-weread">
						<span className="lang-en">WeRead · {wereadBitsEn.join(" · ")}</span>
						<span className="lang-zh">微信读书 · {wereadBitsZh.join(" · ")}</span>
					</p>
				)}
				{item.weread?.progress?.percent !== undefined && (
					<div
						className="library-masonry-progress"
						role="progressbar"
						aria-label={`reading progress ${progressPercent}%`}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={progressPercent}
					>
						<span className="library-masonry-progress-track">
							<span
								className="library-masonry-progress-fill"
								style={{ width: `${progressPercent}%` }}
							/>
						</span>
						<span className="library-masonry-progress-copy">
							<span className="lang-en">
								{progressPercent}%
								{item.weread.progress.chapterName ? ` · ${item.weread.progress.chapterName}` : ""}
							</span>
							<span className="lang-zh">
								{progressPercent}%
								{item.weread.progress.chapterName ? ` · ${item.weread.progress.chapterName}` : ""}
							</span>
						</span>
					</div>
				)}
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

function MasonryCover({ item }: { item: MeasuredItem }) {
	const [failed, setFailed] = useState(false);
	if (item.cover && !failed) {
		return (
			<img
				src={item.cover}
				alt=""
				className="library-masonry-cover-img"
				loading="eager"
				referrerPolicy="no-referrer"
				onError={() => setFailed(true)}
			/>
		);
	}
	return (
		<div className={`library-masonry-cover-fallback ${item.coverClass}`}>
			<span>{item.title}</span>
		</div>
	);
}
