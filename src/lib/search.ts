import { Meilisearch } from "meilisearch";

export const WORDS_INDEX = "words";
export const KANJI_INDEX = "kanji";

export type WordDoc = {
  id: number;
  kanji: string[];
  kana: string[];
  romaji: string[];
  hanViet: string[];
  hanVietPlain: string[];
  glossEn: string[];
  glossVi: string[];
  isCommon: boolean;
  /** For result lists without a DB round-trip. */
  headword: string;
  reading: string;
  preview: string;
  pos: string[];
};

export type KanjiDoc = {
  id: number;
  character: string;
  hanViet: string[];
  hanVietPlain: string[];
  on: string[];
  kun: string[];
  meaningsEn: string[];
  meaningsVi: string[];
  strokeCount: number;
  grade: number | null;
  jlptOld: number | null;
  rank: number; // frequency rank, 99999 when unknown
};

const globalForMeili = globalThis as unknown as { meili?: Meilisearch };

export const meili =
  globalForMeili.meili ??
  new Meilisearch({
    host: process.env.MEILI_HOST ?? "http://localhost:7700",
    apiKey: process.env.MEILI_MASTER_KEY,
  });

if (process.env.NODE_ENV !== "production") globalForMeili.meili = meili;
