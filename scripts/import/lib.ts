import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

export const RAW_DIR = path.resolve(__dirname, "../../data/raw");
export const EXTRACTED_DIR = path.join(RAW_DIR, "extracted");

export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Find a file in data/raw/extracted by prefix (version suffixes change between releases). */
export function findRaw(prefix: string): string {
  const file = fs.readdirSync(EXTRACTED_DIR).find((f) => f.startsWith(prefix));
  if (!file) {
    throw new Error(`Missing ${prefix}* in ${EXTRACTED_DIR}. Run: npm run data:download`);
  }
  return path.join(EXTRACTED_DIR, file);
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/** Insert rows in chunks so a single query never gets too large. */
export async function insertChunked<T>(
  label: string,
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
  size = 5000,
) {
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size));
    process.stdout.write(`\r  ${label}: ${Math.min(i + size, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
}

export function cp(char: string): number {
  return char.codePointAt(0)!;
}

/** Unihan files: "U+5B66<TAB>kField<TAB>value" → Map<char, Map<field, value>> for wanted fields. */
export function readUnihan(file: string, fields: Set<string>): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  for (const line of fs.readFileSync(path.join(EXTRACTED_DIR, file), "utf8").split("\n")) {
    if (!line.startsWith("U+")) continue;
    const [code, field, value] = line.split("\t");
    if (!fields.has(field)) continue;
    const ch = String.fromCodePoint(parseInt(code.slice(2), 16));
    if (!out.has(ch)) out.set(ch, new Map());
    out.get(ch)!.set(field, value.trim());
  }
  return out;
}

export function run(main: () => Promise<void>) {
  const t = Date.now();
  main()
    .then(() => console.log(`Done in ${((Date.now() - t) / 1000).toFixed(1)}s`))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}

export type GlossViRow = { wordId: number; order: number; vi: string[]; reviewed: boolean };

const SEP = "\u001f"; // unit separator: never appears in glosses

/** Bulk-write Vietnamese meanings into Sense rows (one UPDATE per chunk via unnest). */
export async function applyGlossVi(rows: GlossViRow[]) {
  for (let i = 0; i < rows.length; i += 5000) {
    const chunk = rows.slice(i, i + 5000);
    await db.$executeRaw`
      UPDATE "Sense" AS s
      SET "glossVi" = string_to_array(v.vi, ${SEP}), "viReviewed" = v.reviewed
      FROM unnest(
        ${chunk.map((r) => r.wordId)}::int[],
        ${chunk.map((r) => r.order)}::int[],
        ${chunk.map((r) => r.vi.join(SEP))}::text[],
        ${chunk.map((r) => r.reviewed)}::bool[]
      ) AS v(word_id, ord, vi, reviewed)
      WHERE s."wordId" = v.word_id AND s."order" = v.ord`;
  }
}

/** Every stored Vietnamese translation (AIContent WORD_GLOSS_VI) as Sense rows to apply. */
export async function storedGlossVi(): Promise<GlossViRow[]> {
  const rows = await db.aIContent.findMany({
    where: { type: "WORD_GLOSS_VI", status: { not: "REJECTED" } },
    select: { targetKey: true, content: true, status: true },
  });
  return rows.flatMap((r) => {
    const wordId = Number(r.targetKey.replace("word:", ""));
    const { senses } = JSON.parse(r.content) as { senses: { order: number; vi: string[] }[] };
    return senses.map((s) => ({ wordId, order: s.order, vi: s.vi, reviewed: r.status === "APPROVED" }));
  });
}
