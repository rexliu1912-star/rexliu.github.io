declare module "@pagefind/default-ui" {
	export class PagefindUI {
		constructor(options?: {
			element?: string;
			bundlePath?: string;
			baseUrl?: string;
			pageSize?: number;
			resetStyles?: boolean;
			showImages?: boolean;
			showSubResults?: boolean;
			excerptLength?: number;
			processResult?: (result: unknown) => unknown;
			processTerm?: (term: string) => string;
			showEmptyFilters?: boolean;
			openFilters?: string[];
			debounceTimeoutMs?: number;
			mergeIndex?: { bundlePath: string; baseUrl?: string }[];
			translations?: Record<string, string>;
		});
	}
}
