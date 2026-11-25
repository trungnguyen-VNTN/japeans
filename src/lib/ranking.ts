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
 * 3 = exact match on one form as typed,
 * 2 = exact only after removing Vietnamese diacritics,
 * 1 = a Japanese form or romaji starts with the query (user still typing: たべ → たべる),
 * 0 = other.
 */
export function matchTier(w: RankFields, query: string): 0 | 1 | 2 | 3 {
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
    return 3;
  }
  if (w.hanVietPlain.includes(stripVietnamese(q))) return 2;
  const startsWith = (forms: string[], prefix: string) => forms.some((f) => f.startsWith(prefix));
  if (startsWith(w.kanji, q) || startsWith(w.kana, q) || startsWith(w.kana, qKana) || startsWith(w.romaji, q)) {
    return 1;
  }
  return 0;
}

/** Length of the shortest Japanese form: among equal matches, shorter words are more basic. */
const shortestForm = (w: RankFields) => Math.min(...[...w.kanji, ...w.kana].map((f) => f.length), 99);

/**
 * Meilisearch treats array fields as one string, so a word with two readings never counts as an
 * "exact" match. Re-rank the top hits: best match tier first, then common words; prefix matches are
 * further ordered shortest first; Meilisearch order breaks remaining ties.
 */
export function rerank<T extends RankFields>(hits: T[], query: string): T[] {
  return hits
    .map((w, i) => ({ w, i, t: matchTier(w, query), len: shortestForm(w) }))
    .sort(
      (a, b) =>
        b.t - a.t ||
        Number(b.w.isCommon) - Number(a.w.isCommon) ||
        (a.t === 1 ? a.len - b.len : 0) ||
        a.i - b.i,
    )
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
