/**
 * Imports JMdict (jmdict-simplified "examples" edition) into Word / WordKanjiForm /
 * WordReading / Sense, and the Tatoeba sentences it links into Example / WordExample.
 *
 * Re-runnable: child tables are rebuilt; Word rows are kept (study cards reference them)
 * and only inserted when new. Vietnamese meanings live in AIContent and are re-applied.
 */
import { toRomaji } from "wanakana";
import type { Prisma } from "../../src/generated/prisma/client";
import { applyGlossVi, db, findRaw, insertChunked, readJson, run, storedGlossVi } from "./lib";

type Xref = [string, string?, number?] | [string, number?];
type JmWord = {
  id: string;
  kanji: { common: boolean; text: string; tags: string[] }[];
  kana: { common: boolean; text: string; tags: string[]; appliesToKanji: string[] }[];
  sense: {
    partOfSpeech: string[];
    related: Xref[];
    antonym: Xref[];
    field: string[];
    misc: string[];
    info: string[];
    gloss: { lang: string; text: string }[];
    examples?: {
      source: { type: string; value: string };
      text: string;
      sentences: { lang: string; text: string }[];
    }[];
  }[];
};

const xrefText = (x: Xref) => x.filter((p) => typeof p === "string").join("・");

async function main() {
  console.log("Reading JMdict…");
  const { words } = readJson<{ words: JmWord[] }>(findRaw("jmdict-examples-eng"));

  const wordRows: Prisma.WordCreateManyInput[] = [];
  const kanjiRows: Prisma.WordKanjiFormCreateManyInput[] = [];
  const readingRows: Prisma.WordReadingCreateManyInput[] = [];
  const senseRows: Prisma.SenseCreateManyInput[] = [];
  const examples = new Map<number, { id: number; textJa: string; textEn: string | null }>();
  const links = new Map<string, { wordId: number; exampleId: number; senseOrder: number; form: string }>();

  for (const w of words) {
    const id = Number(w.id);
    wordRows.push({ id, isCommon: w.kanji.some((k) => k.common) || w.kana.some((k) => k.common) });
    w.kanji.forEach((k, order) =>
      kanjiRows.push({ wordId: id, order, text: k.text, isCommon: k.common, tags: k.tags }),
    );
    w.kana.forEach((k, order) =>
      readingRows.push({
        wordId: id,
        order,
        kana: k.text,
        romaji: toRomaji(k.text),
        isCommon: k.common,
        tags: k.tags,
        appliesToKanji: k.appliesToKanji,
      }),
    );
    w.sense.forEach((s, order) => {
      senseRows.push({
        wordId: id,
        order,
        partsOfSpeech: s.partOfSpeech,
        misc: s.misc,
        fields: s.field,
        info: s.info,
        related: s.related.map(xrefText),
        antonyms: s.antonym.map(xrefText),
        glossEn: s.gloss.filter((g) => g.lang === "eng").map((g) => g.text),
        glossVi: [],
      });
      for (const ex of s.examples ?? []) {
        if (ex.source.type !== "tatoeba") continue;
        const exampleId = Number(ex.source.value);
        const ja = ex.sentences.find((x) => x.lang === "jpn")?.text;
        if (!ja) continue;
        examples.set(exampleId, {
          id: exampleId,
          textJa: ja,
          textEn: ex.sentences.find((x) => x.lang === "eng")?.text ?? null,
        });
        const key = `${id}:${exampleId}`;
        if (!links.has(key)) links.set(key, { wordId: id, exampleId, senseOrder: order, form: ex.text });
      }
    });
  }

  console.log("Writing to Postgres…");
  await db.$executeRawUnsafe(
    `TRUNCATE "WordExample", "Example", "Sense", "WordReading", "WordKanjiForm" RESTART IDENTITY`,
  );
  await insertChunked("words", wordRows, (rows) => db.word.createMany({ data: rows, skipDuplicates: true }));
  await insertChunked("kanji forms", kanjiRows, (rows) => db.wordKanjiForm.createMany({ data: rows }));
  await insertChunked("readings", readingRows, (rows) => db.wordReading.createMany({ data: rows }));
  await insertChunked("senses", senseRows, (rows) => db.sense.createMany({ data: rows }), 3000);
  await insertChunked("examples", [...examples.values()], (rows) => db.example.createMany({ data: rows }));
  await insertChunked("example links", [...links.values()], (rows) => db.wordExample.createMany({ data: rows }));

  // Re-apply Vietnamese meanings kept in AIContent (Sense was rebuilt above).
  const glossVi = await storedGlossVi();
  await applyGlossVi(glossVi);

  console.log(`Vietnamese meanings re-applied to ${glossVi.length} senses`);
  console.log(`Words ${wordRows.length}, senses ${senseRows.length}, examples ${examples.size}`);
}

run(main);
