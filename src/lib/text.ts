/** Remove Vietnamese diacritics: "học sinh" → "hoc sinh". */
export function stripVietnamese(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

const KANJI_RE = /[㐀-鿿豈-﫿\u{20000}-\u{2ffff}々]/u;

export function isKanji(ch: string): boolean {
  return KANJI_RE.test(ch);
}

export function kanjiIn(s: string): string[] {
  return [...new Set([...s].filter(isKanji))];
}

/**
 * "学生" + map → ["học sanh", "học sinh"]: every combination of each kanji's Hán Việt
 * readings (capped). Empty when the text has kana or a kanji without a reading.
 */
export function hanVietOf(text: string, map: Map<string, string[]>, cap = 8): string[] {
  let combos: string[][] = [[]];
  for (const ch of text) {
    if (!isKanji(ch)) return []; // mixed kana words have no clean Hán Việt
    const options = ch === "々" ? null : map.get(ch);
    if (ch !== "々" && !options?.length) return [];
    combos = combos
      .flatMap((c) => (options ?? [c.at(-1)!]).map((o) => [...c, o]))
      .slice(0, cap);
  }
  if (!combos[0].length) return [];
  return [...new Set(combos.map((c) => c.join(" ").toLowerCase().normalize("NFC")))];
}
