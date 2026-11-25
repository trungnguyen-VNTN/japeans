/**
 * Imports radicals (Kangxi + RADKFILE), kanji (KANJIDIC2), Hán Việt readings
 * (KANJIDIC2 "vietnam", fallback Unihan kVietnamese via old/traditional variants),
 * decompositions (KRADFILE) and stroke paths (KanjiVG).
 *
 * Re-runnable: wipes and reloads Kanji, Radical and KanjiComponent (no user data references them).
 */
import fs from "node:fs";
import path from "node:path";
import { cp, db, findRaw, insertChunked, RAW_DIR, readJson, readUnihan, run } from "./lib";

type Kanjidic = {
  characters: {
    literal: string;
    radicals: { type: string; value: number }[];
    misc: { grade: number | null; strokeCounts: number[]; frequency: number | null; jlptLevel: number | null };
    readingMeaning: {
      groups: { readings: { type: string; value: string }[]; meanings: { lang: string; value: string }[] }[];
      nanori: string[];
    } | null;
  }[];
};

/**
 * RADKFILE uses ordinary kanji as stand-ins for radical forms that have no JIS code.
 * Display mapping documented by EDRDG (radkfile notes); this is presentation only.
 */
const RADK_DISPLAY: Record<string, string> = {
  化: "亻", 个: "𠆢", 并: "丷", 刈: "刂", 込: "辶", 尚: "⺌", 忙: "忄", 扎: "扌",
  汁: "氵", 犯: "犭", 艾: "艹", 邦: "阝", 阡: "阝", 老: "耂", 杰: "灬", 礼: "礻",
  初: "衤", 買: "罒",
};

/** Characters whose Hán Việt is looked up via these Unihan variant fields when missing. */
const VARIANT_FIELDS = ["kJapaneseOldVariant", "kTraditionalVariant", "kSemanticVariant", "kZVariant"];

function readKangxi(): Map<number, string> {
  // "9; 2F08; 4EBA" → radical number → unified ideograph
  const map = new Map<number, string>();
  for (const line of fs.readFileSync(path.join(RAW_DIR, "CJKRadicals.txt"), "utf8").split("\n")) {
    const m = line.match(/^(\d+);\s*[0-9A-F]+;\s*([0-9A-F]+)/);
    if (m) map.set(Number(m[1]), String.fromCodePoint(parseInt(m[2], 16)));
  }
  return map;
}

function readKanjiVG(): Map<string, string[]> {
  const xml = fs.readFileSync(path.join(RAW_DIR, "kanjivg.xml"), "utf8");
  const out = new Map<string, string[]>();
  const blockRe = /<kanji id="kvg:kanji_([0-9a-f]+)">([\s\S]*?)<\/kanji>/g;
  for (const m of xml.matchAll(blockRe)) {
    const char = String.fromCodePoint(parseInt(m[1], 16));
    const paths = [...m[2].matchAll(/<path [^>]*\sd="([^"]+)"/g)].map((p) => p[1]);
    if (paths.length) out.set(char, paths);
  }
  return out;
}

async function main() {
  console.log("Reading sources…");
  const kanjidic = readJson<Kanjidic>(findRaw("kanjidic2-en"));
  const kradfile = readJson<{ kanji: Record<string, string[]> }>(findRaw("kradfile"));
  const radkfile = readJson<{ radicals: Record<string, { strokeCount: number }> }>(findRaw("radkfile"));
  const kangxi = readKangxi();
  const strokes = readKanjiVG();
  const unihan = readUnihan("Unihan_Readings.txt", new Set(["kVietnamese", "kDefinition"]));
  const variants = readUnihan("Unihan_Variants.txt", new Set(VARIANT_FIELDS));
  const totalStrokes = readUnihan("Unihan_IRGSources.txt", new Set(["kTotalStrokes"]));

  const byChar = new Map(kanjidic.characters.map((c) => [c.literal, c]));

  function readingsOf(char: string, type: string): string[] {
    return byChar.get(char)?.readingMeaning?.groups.flatMap((g) => g.readings.filter((r) => r.type === type).map((r) => r.value)) ?? [];
  }

  function hanVietOf(char: string): string[] {
    const norm = (rs: string[]) => [...new Set(rs.map((r) => r.toUpperCase().normalize("NFC")))];
    const fromKanjidic = norm(readingsOf(char, "vietnam"));
    if (fromKanjidic.length) {
      // KANJIDIC's order is arbitrary (本 → BỔN, BẢN). Unihan lists the usual reading first but
      // mixes in Nôm readings (年 → nên), so only use it to reorder KANJIDIC's own readings.
      const preferred = norm([unihan.get(char)?.get("kVietnamese")?.split(" ")[0] ?? ""])[0];
      const i = fromKanjidic.indexOf(preferred);
      if (i > 0) fromKanjidic.unshift(...fromKanjidic.splice(i, 1));
      return fromKanjidic;
    }
    const candidates = [char];
    for (const f of VARIANT_FIELDS) {
      for (const code of variants.get(char)?.get(f)?.split(" ") ?? []) {
        candidates.push(String.fromCodePoint(parseInt(code.replace(/^U\+/, "").split("<")[0], 16)));
      }
    }
    for (const c of candidates) {
      const vi = unihan.get(c)?.get("kVietnamese");
      if (vi) return norm(vi.split(" ").slice(0, 3));
    }
    return [];
  }

  function meaningsEnOf(char: string): string[] {
    return byChar.get(char)?.readingMeaning?.groups.flatMap((g) => g.meanings.filter((m) => m.lang === "en").map((m) => m.value)) ?? [];
  }

  // ── Radicals ──
  type RadicalRow = {
    id: number; character: string; display: string; kangxiNo: number | null;
    strokeCount: number; hanViet: string | null; meaningEn: string | null;
  };
  const radicals = new Map<string, RadicalRow>();
  for (const [no, char] of kangxi) {
    radicals.set(char, {
      id: no,
      character: char,
      display: char,
      kangxiNo: no,
      strokeCount:
        byChar.get(char)?.misc.strokeCounts[0] ??
        Number(totalStrokes.get(char)?.get("kTotalStrokes")?.split(" ")[0] ?? 0),
      hanViet: hanVietOf(char)[0] ?? null,
      meaningEn: meaningsEnOf(char).slice(0, 3).join(", ") || unihan.get(char)?.get("kDefinition") || null,
    });
  }
  let extraId = 1000;
  for (const [char, info] of Object.entries(radkfile.radicals)) {
    const existing = radicals.get(char);
    if (existing) {
      existing.strokeCount = info.strokeCount;
      continue;
    }
    const display = RADK_DISPLAY[char] ?? char;
    radicals.set(char, {
      id: extraId++,
      character: char,
      display,
      kangxiNo: null,
      strokeCount: info.strokeCount,
      hanViet: display === char ? (hanVietOf(char)[0] ?? null) : null,
      meaningEn: display === char ? meaningsEnOf(char).slice(0, 3).join(", ") || null : null,
    });
  }

  // ── Kanji ──
  const kanjiRows = kanjidic.characters.map((c) => {
    const rm = c.readingMeaning;
    const classical = c.radicals.find((r) => r.type === "classical")?.value ?? null;
    const paths = strokes.get(c.literal);
    return {
      id: cp(c.literal),
      character: c.literal,
      onReadings: readingsOf(c.literal, "ja_on"),
      kunReadings: readingsOf(c.literal, "ja_kun"),
      nanori: rm?.nanori ?? [],
      hanViet: hanVietOf(c.literal),
      meaningsEn: meaningsEnOf(c.literal),
      meaningsVi: [],
      strokeCount: c.misc.strokeCounts[0] ?? paths?.length ?? 0,
      jlptOld: c.misc.jlptLevel,
      grade: c.misc.grade,
      frequency: c.misc.frequency,
      kangxiRadical: classical,
      radicalId: classical,
      strokeSvg: paths ? JSON.stringify(paths) : null,
    };
  });

  // ── Components ──
  const components: { kanjiId: number; radicalId: number; position: number }[] = [];
  for (const [char, parts] of Object.entries(kradfile.kanji)) {
    if (!byChar.has(char)) continue;
    const seen = new Set<number>();
    parts.forEach((part, i) => {
      const r = radicals.get(part);
      if (!r || seen.has(r.id)) return;
      seen.add(r.id);
      components.push({ kanjiId: cp(char), radicalId: r.id, position: i });
    });
  }

  console.log("Writing to Postgres…");
  await db.$executeRawUnsafe(`TRUNCATE "KanjiComponent", "Kanji", "Radical" CASCADE`);
  await insertChunked("radicals", [...radicals.values()], (rows) => db.radical.createMany({ data: rows }));
  await insertChunked("kanji", kanjiRows, (rows) => db.kanji.createMany({ data: rows }), 2000);
  await insertChunked("components", components, (rows) => db.kanjiComponent.createMany({ data: rows }));

  const withHv = kanjiRows.filter((k) => k.hanViet.length).length;
  const withSvg = kanjiRows.filter((k) => k.strokeSvg).length;
  console.log(
    `Kanji ${kanjiRows.length} (Hán Việt ${withHv}, stroke order ${withSvg}), radicals ${radicals.size}, components ${components.length}`,
  );
}

run(main);
