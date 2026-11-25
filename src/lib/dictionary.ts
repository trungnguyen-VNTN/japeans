import { cacheLife } from "next/cache";
import { isRomaji, toHiragana } from "wanakana";
import { db } from "@/lib/db";
import { KANJI_INDEX, meili, WORDS_INDEX, type KanjiDoc, type WordDoc } from "@/lib/search";
import { kanjiIn, stripVietnamese } from "@/lib/text";

export type WordHit = Pick<WordDoc, "id" | "headword" | "reading" | "hanViet" | "preview" | "isCommon" | "pos">;
export type KanjiHit = Pick<KanjiDoc, "character" | "hanViet" | "meaningsEn" | "strokeCount">;

const lower = (s: string) => s.toLowerCase().normalize("NFC");

/**
 * Meilisearch treats array fields as one string, so a word with two readings never counts as an
 * "exact" match. Re-rank the top hits: exact match on any single form first, then common words.
 */
function rerank(hits: WordDoc[], query: string): WordDoc[] {
  const q = lower(query);
  const qPlain = stripVietnamese(q);
  const qKana = isRomaji(q) ? toHiragana(q) : q;
  // 2 = exact match on a form as typed, 1 = exact only after removing Vietnamese diacritics.
  const tier = (w: WordDoc) =>
    w.kanji.includes(q) ||
    w.kana.includes(q) ||
    w.kana.includes(qKana) ||
    w.romaji.includes(q) ||
    w.hanViet.includes(q) ||
    w.glossVi.some((g) => lower(g) === q) ||
    w.glossEn.some((g) => lower(g) === q)
      ? 2
      : w.hanVietPlain.includes(qPlain)
        ? 1
        : 0;
  return hits
    .map((w, i) => ({ w, i, t: tier(w) }))
    .sort((a, b) => b.t - a.t || Number(b.w.isCommon) - Number(a.w.isCommon) || a.i - b.i)
    .map((x) => x.w);
}

/** Show the Hán Việt reading the user typed (e.g. "nhật bản" rather than "nhật bổn"). */
function bestHanViet(w: WordDoc, query: string): string[] {
  const qPlain = stripVietnamese(lower(query));
  const i = w.hanVietPlain.indexOf(qPlain);
  const exact = w.hanViet.indexOf(lower(query));
  const pick = exact >= 0 ? exact : i;
  return pick > 0 ? [w.hanViet[pick], ...w.hanViet.filter((_, j) => j !== pick)] : w.hanViet;
}

export async function searchDictionary(query: string) {
  "use cache";
  cacheLife("hours");

  const q = query.trim().slice(0, 100);
  if (!q) return { words: [] as WordHit[], kanji: [] as KanjiHit[], total: 0 };

  const [wordRes, kanji] = await Promise.all([
    meili.index<WordDoc>(WORDS_INDEX).search(q, { limit: 150 }),
    searchKanji(q),
  ]);

  const words = rerank(wordRes.hits, q)
    .slice(0, 40)
    .map((w) => ({
      id: w.id,
      headword: w.headword,
      reading: w.reading,
      hanViet: bestHanViet(w, q),
      preview: w.preview,
      isCommon: w.isCommon,
      pos: w.pos,
    }));

  return { words, kanji, total: wordRes.estimatedTotalHits ?? words.length };
}

async function searchKanji(q: string): Promise<KanjiHit[]> {
  const chars = kanjiIn(q);
  const select = { character: true, hanViet: true, meaningsEn: true, strokeCount: true } as const;
  if (chars.length) {
    const rows = await db.kanji.findMany({ where: { character: { in: chars } }, select });
    return chars.map((c) => rows.find((r) => r.character === c)).filter((r): r is KanjiHit => !!r);
  }
  // Latin / Vietnamese queries: only show kanji whose Hán Việt matches exactly (e.g. "học" → 学, 學).
  const qPlain = stripVietnamese(lower(q));
  if (qPlain.includes(" ") || !/^[a-z]+$/.test(qPlain)) return [];
  const hasDiacritics = qPlain !== lower(q);
  const res = await meili.index<KanjiDoc>(KANJI_INDEX).search(q, { limit: 30 });
  return res.hits
    .filter((k) =>
      hasDiacritics ? k.hanViet.some((h) => lower(h) === lower(q)) : k.hanVietPlain.some((h) => lower(h) === qPlain),
    )
    .slice(0, 12)
    .map(({ character, hanViet, meaningsEn, strokeCount }) => ({ character, hanViet, meaningsEn, strokeCount }));
}

export async function getWord(id: number) {
  "use cache";
  cacheLife("days");

  const word = await db.word.findUnique({
    where: { id },
    include: {
      kanjiForms: { orderBy: { order: "asc" } },
      readings: { orderBy: { order: "asc" } },
      senses: { orderBy: { order: "asc" } },
      examples: { include: { example: true }, orderBy: { senseOrder: "asc" }, take: 30 },
    },
  });
  if (!word) return null;

  const chars = kanjiIn(word.kanjiForms.map((k) => k.text).join(""));
  const kanji = await db.kanji.findMany({
    where: { character: { in: chars } },
    select: { character: true, hanViet: true, meaningsEn: true, onReadings: true, kunReadings: true },
  });
  return { ...word, kanji: chars.map((c) => kanji.find((k) => k.character === c)).filter((k) => !!k) };
}

export async function getKanji(character: string) {
  "use cache";
  cacheLife("days");

  const kanji = await db.kanji.findUnique({
    where: { character },
    include: {
      radical: true,
      components: { include: { radical: true }, orderBy: { position: "asc" } },
    },
  });
  if (!kanji) return null;

  // Components that are themselves kanji get a link.
  const linkable = new Set(
    (
      await db.kanji.findMany({
        where: { character: { in: kanji.components.map((c) => c.radical.display) } },
        select: { character: true },
      })
    ).map((k) => k.character),
  );

  const forms = await db.wordKanjiForm.findMany({
    where: { text: { contains: character }, isCommon: true },
    select: { wordId: true },
    distinct: ["wordId"],
    take: 24,
    orderBy: { wordId: "asc" },
  });
  const words = await db.word.findMany({
    where: { id: { in: forms.map((f) => f.wordId) } },
    include: {
      kanjiForms: { orderBy: { order: "asc" }, take: 1 },
      readings: { orderBy: { order: "asc" }, take: 1 },
      senses: { orderBy: { order: "asc" }, take: 1 },
    },
  });
  // Shorter words first: they show the kanji's core meaning.
  words.sort((a, b) => (a.kanjiForms[0]?.text.length ?? 9) - (b.kanjiForms[0]?.text.length ?? 9));

  return {
    ...kanji,
    strokes: kanji.strokeSvg ? (JSON.parse(kanji.strokeSvg) as string[]) : [],
    components: kanji.components.map((c) => ({ ...c.radical, isKanji: linkable.has(c.radical.display) })),
    words,
  };
}

export async function getKanjiByGrade() {
  "use cache";
  cacheLife("days");

  const rows = await db.kanji.findMany({
    where: { grade: { lte: 6 } },
    select: { character: true, grade: true, hanViet: true },
    orderBy: [{ grade: "asc" }, { frequency: { sort: "asc", nulls: "last" } }],
  });
  const groups = new Map<number, typeof rows>();
  for (const r of rows) {
    if (!groups.has(r.grade!)) groups.set(r.grade!, []);
    groups.get(r.grade!)!.push(r);
  }
  return [...groups.entries()];
}
