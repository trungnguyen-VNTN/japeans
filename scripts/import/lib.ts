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
