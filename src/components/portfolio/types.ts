export interface PortfolioSignal {
label: string;
value: string;
light: string;
}
export interface PortfolioStop {
level_pct_from_current: string;
severity: string;
description?: string;
}
export interface PortfolioTarget {
price_pct_from_current: string | null;
description?: string;
optimistic_price?: string | null;
}
export interface PortfolioNextEvent {
date: string;
label: string;
urgency: string;
}
export interface PortfolioPosition {
symbol: string;
market: string;
flag: string;
sector_tags_en: string[];
sector_tags_zh: string[];
thesis_en: string;
thesis_zh: string;
stage: number;
status_en: string;
status_zh: string;
conviction: string;
entry_year?: number;
horizon?: string;
layer?: string | null;
layer_label_en?: string | null;
layer_label_zh?: string | null;
stop?: PortfolioStop | null;
target?: PortfolioTarget | null;
price?: number;
daily_change_pct?: number;
next_event?: PortfolioNextEvent | null;
news?: {
	summary: string;
	sentiment: "positive" | "neutral" | "negative";
	items: { title: string; snippet: string }[];
} | null;
}
export interface PortfolioHeatmap {
tickers: string[];
dates: string[];
scores: (number | null)[][];
ticker_names: Record<string, string>;
}
export interface PortfolioRegimeCurrent {
label: string;
label_en: string;
aggression: string;
green_count: number;
total_signals?: number;
signals: Record<string, PortfolioSignal>;
}
export interface PortfolioRegimeHistoryPoint {
date: string;
regime: string;
green_count: number;
vix: number | null;
}
export interface PortfolioData {
regime: { current: PortfolioRegimeCurrent; history_60d: PortfolioRegimeHistoryPoint[] };
allocation: { current: { categories: any[] } };
positions: PortfolioPosition[];
crypto: {
	updated_at: string;
	positions: {
		symbol: string;
		role: "core" | "community";
		tags_en: string[];
		tags_zh: string[];
		thesis_en: string;
		thesis_zh: string;
		strategy_en: string;
		strategy_zh: string;
	}[];
} | null;
crypto_monitor: any | null;
gold_tracker: any | null;
watchlist_heatmap: PortfolioHeatmap | null;
clearances: any[];
roundtables: any[];
sector_research?: any[];
deep_research?: any[];
stats: {
	active_positions: number;
	markets: number;
	tracked_rules: number;
	upcoming_events: number;
	weekly_scan_hits: number;
	days_since_last_clearance: number | null;
};
generated_at: string;
}
