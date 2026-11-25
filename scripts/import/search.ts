/** Builds the Meilisearch "words" and "kanji" indexes from Postgres. Re-runnable. */
import "dotenv/config"; // must load before src/lib/search creates the client
import { hanVietOf, stripVietnamese } from "../../src/lib/text";
import { KANJI_INDEX, meili, WORDS_INDEX, type KanjiDoc, type WordDoc } from "../../src/lib/search";
import { db, run } from "./lib";

async function pushAll<T extends Record<string, unknown>>(index: string, docs: T[]) {
  const size = 20000;
  for (let i = 0; i < docs.length; i += size) {
    const task = await meili.index(index).addDocuments(docs.slice(i, i + size), { primaryKey: "id" }).waitTask({ timeout: 600_000 });
    if (task.status !== "succeeded") throw new Error(`${index}: ${JSON.stringify(task.error)}`);
    process.stdout.write(`\r  ${index}: ${Math.min(i + size, docs.length)}/${docs.length}`);
  }
  process.stdout.write("\n");
}

async function resetIndex(index: string, settings: Parameters<ReturnType<typeof meili.index>["updateSettings"]>[0]) {
  await meili.deleteIndex(index).waitTask();
  await meili.createIndex(index, { primaryKey: "id" }).waitTask();
  const task = await meili.index(index).updateSettings(settings).waitTask();
  if (task.status !== "succeeded") throw new Error(`${index} settings: ${JSON.stringify(task.error)}`);
}

async function main() {
  // ── Kanji ──
  const kanji = await db.kanji.findMany({
    select: { id: true, character: true, hanViet: true, onReadings: true, kunReadings: true, meaningsEn: true, meaningsVi: true, strokeCount: true, grade: true, jlptOld: true, frequency: true },
  });
  const hvMap = new Map(kanji.filter((k) => k.hanViet.length).map((k) => [k.character, k.hanViet]));

  await resetIndex(KANJI_INDEX, {
    searchableAttributes: ["character", "hanViet", "hanVietPlain", "meaningsVi", "meaningsEn", "on", "kun"],
    filterableAttributes: ["grade", "jlptOld", "strokeCount"],
    sortableAttributes: ["rank", "strokeCount"],
    rankingRules: ["words", "typo", "exactness", "attribute", "rank:asc", "proximity", "sort"],
  });
  await pushAll<KanjiDoc>(
    KANJI_INDEX,
    kanji.map((k) => ({
      id: k.id,
      character: k.character,
      hanViet: k.hanViet,
      hanVietPlain: k.hanViet.map(stripVietnamese),
      on: k.onReadings,
      kun: k.kunReadings.map((r) => r.replace(/[.-]/g, "")),
      meaningsEn: k.meaningsEn,
      meaningsVi: k.meaningsVi,
      strokeCount: k.strokeCount,
      grade: k.grade,
      jlptOld: k.jlptOld,
      rank: k.frequency ?? 99999,
    })),
  );

  // ── Words ──
  await resetIndex(WORDS_INDEX, {
    searchableAttributes: ["kanji", "kana", "romaji", "hanViet", "hanVietPlain", "glossVi", "glossEn"],
    filterableAttributes: ["isCommon", "pos"],
    rankingRules: ["words", "typo", "exactness", "attribute", "isCommon:desc", "proximity", "sort"],
    typoTolerance: { minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 } },
  });

  const docs: WordDoc[] = [];
  let cursor = 0;
  for (;;) {
    const batch = await db.word.findMany({
      where: { id: { gt: cursor } },
      orderBy: { id: "asc" },
      take: 20000,
      include: {
        kanjiForms: { orderBy: { order: "asc" } },
        readings: { orderBy: { order: "asc" } },
        senses: { orderBy: { order: "asc" } },
      },
    });
    if (!batch.length) break;
    cursor = batch.at(-1)!.id;
    for (const w of batch) {
      const kanjiTexts = w.kanjiForms.map((k) => k.text);
      const hv = [...new Set(kanjiTexts.flatMap((t) => hanVietOf(t, hvMap)))].slice(0, 12);
      // Prefer the reading-only headword for words usually written in kana ("uk").
      const usuallyKana = w.senses[0]?.misc.includes("uk");
      docs.push({
        id: w.id,
        kanji: kanjiTexts,
        kana: w.readings.map((r) => r.kana),
        romaji: [...new Set(w.readings.map((r) => r.romaji))],
        hanViet: hv,
        hanVietPlain: hv.map(stripVietnamese),
        glossEn: w.senses.flatMap((s) => s.glossEn),
        glossVi: w.senses.flatMap((s) => s.glossVi),
        isCommon: w.isCommon,
        headword: (!usuallyKana && kanjiTexts[0]) || w.readings[0]?.kana || "",
        reading: w.readings[0]?.kana ?? "",
        preview: w.senses.slice(0, 3).map((s) => s.glossVi[0] ?? s.glossEn.slice(0, 2).join(", ")).join("; "),
        pos: [...new Set(w.senses.flatMap((s) => s.partsOfSpeech))],
      });
    }
    process.stdout.write(`\r  loaded ${docs.length} words`);
  }
  process.stdout.write("\n");
  await pushAll(WORDS_INDEX, docs);
  console.log(`Indexed ${kanji.length} kanji, ${docs.length} words`);
}

run(main);
