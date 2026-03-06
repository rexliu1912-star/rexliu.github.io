/**
 * i18n utilities — language detection, switching, and translation.
 */

import { ui, type Lang, type UIKey } from "./ui";

export const DEFAULT_LANG: Lang = "en";
export const LANG_KEY = "rex-lang";

/** Get a translated UI string */
export function t(key: UIKey, lang: Lang = DEFAULT_LANG): string {
	return ui[key]?.[lang] ?? ui[key]?.en ?? key;
}

/** Pick bilingual field: returns zh or en version based on lang, with fallback */
export function pick(
	data: { [key: string]: unknown },
	field: string,
	lang: Lang = DEFAULT_LANG,
): string {
	const zhKey = `${field}_zh`;
	const enKey = `${field}_en`;

	if (lang === "zh") {
		return (data[zhKey] as string) ?? (data[field] as string) ?? "";
	}
	return (data[enKey] as string) ?? (data[field] as string) ?? "";
}

/** Check if bilingual content exists for the other language */
export function hasBilingual(
	data: { [key: string]: unknown },
	field: string,
	lang: Lang = DEFAULT_LANG,
): boolean {
	const otherKey = lang === "en" ? `${field}_zh` : `${field}_en`;
	return !!data[otherKey];
}
