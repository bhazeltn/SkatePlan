/** Deterministic ISO 3166-1 alpha-2 -> Unicode flag emoji.
 *
 * Each flag is two Regional Indicator Symbols (U+1F1E6..U+1F1FF), formed by
 * offsetting each uppercased letter from 'A'. Returns "" for anything that is
 * not exactly two ASCII letters so callers can render a neutral fallback.
 */
const BASE = 0x1f1e6; // Regional Indicator Symbol Letter A
const A = "A".charCodeAt(0);

export function flagEmoji(countryCode?: string | null): string {
  if (!countryCode) return "";
  const cc = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(
    BASE + (cc.charCodeAt(0) - A),
    BASE + (cc.charCodeAt(1) - A)
  );
}
