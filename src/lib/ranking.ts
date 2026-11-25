/** Pure search-ranking helpers (no DB / network), unit-tested in ranking.test.ts. */
import { isRomaji, toHiragana } from "wanakana";
import type { KanjiDoc, WordDoc } from "@/lib/search";
import { stripVietnamese } from "@/lib/text";

export const lower = (s: string) => s.toLowerCase().normalize("NFC");

type RankFields = Pick<
  WordDoc,
  "kanji" | "kana" | "romaji" | "hanViet" | "hanVietPlain" | "glossVi" | "glossEn" | "isCommon"
>;

/**
 * 2 = exact match on one form as typed, 1 = exact only after removing Vietnamese diacritics, 0 = other.
 */
export function matchTier(w: RankFields, query: string): 0 | 1 | 2 {
  const q = lower(query);
  const qKana = isRomaji(q) ? toHiragana(q) : q;
  if (
    w.kanji.includes(q) ||
    w.kana.includes(q) ||
    w.kana.includes(qKana) ||
    w.romaji.includes(q) ||
    w.hanViet.includes(q) ||
    w.glossVi.some((g) => lower(g) === q) ||
    w.glossEn.some((g) => lower(g) === q)
  ) {
    return 2;
  }
  return w.hanVietPlain.includes(stripVietnamese(q)) ? 1 : 0;
}

/**
 * Meilisearch treats array fields as one string, so a word with two readings never counts as an
 * "exact" match. Re-rank the top hits: best match tier first, then common words, then Meilisearch order.
 */
export function rerank<T extends RankFields>(hits: T[], query: string): T[] {
  return hits
    .map((w, i) => ({ w, i, t: matchTier(w, query) }))
    .sort((a, b) => b.t - a.t || Number(b.w.isCommon) - Number(a.w.isCommon) || a.i - b.i)
    .map((x) => x.w);
}

/** Put the Hán Việt reading the user typed first (e.g. "nhật bản" rather than "nhật bổn"). */
export function bestHanViet(w: Pick<WordDoc, "hanViet" | "hanVietPlain">, query: string): string[] {
  const exact = w.hanViet.indexOf(lower(query));
  const pick = exact >= 0 ? exact : w.hanVietPlain.indexOf(stripVietnamese(lower(query)));
  return pick > 0 ? [w.hanViet[pick], ...w.hanViet.filter((_, j) => j !== pick)] : w.hanViet;
}

/**
 * Whether a kanji's Hán Việt matches a single-syllable query exactly.
 * With diacritics ("học") the tones must match; without ("hoc") any tone matches.
 */
export function kanjiMatchesHanViet(k: Pick<KanjiDoc, "hanViet" | "hanVietPlain">, query: string): boolean {
  const q = lower(query);
  const qPlain = stripVietnamese(q);
  return qPlain !== q
    ? k.hanViet.some((h) => lower(h) === q)
    : k.hanVietPlain.some((h) => lower(h) === qPlain);
}

/** Only plain single Latin syllables are looked up as Hán Việt kanji readings. */
export function isHanVietSyllable(query: string): boolean {
  return /^[a-z]+$/.test(stripVietnamese(lower(query.trim())));
}
