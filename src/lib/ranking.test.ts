import { describe, expect, it } from "vitest";
import { bestHanViet, isHanVietSyllable, kanjiMatchesHanViet, matchTier, rerank } from "./ranking";
import { stripVietnamese } from "./text";

type Doc = Parameters<typeof rerank>[0][number] & { headword: string };

function word(headword: string, fields: Partial<Doc> = {}): Doc {
  const hanViet = fields.hanViet ?? [];
  return {
    headword,
    kanji: [headword],
    kana: [],
    romaji: [],
    hanViet,
    hanVietPlain: hanViet.map(stripVietnamese),
    glossVi: [],
    glossEn: [],
    isCommon: false,
    ...fields,
  };
}

const heads = (docs: Doc[]) => docs.map((d) => d.headword);

describe("matchTier", () => {
  it("is 3 for an exact form, including one of several readings", () => {
    const nihon = word("日本", { kana: ["にほん", "にっぽん"] });
    expect(matchTier(nihon, "にっぽん")).toBe(3);
    expect(matchTier(nihon, "日本")).toBe(3);
  });

  it("converts romaji to kana before comparing", () => {
    expect(matchTier(word("食べる", { kana: ["たべる"] }), "taberu")).toBe(3);
  });

  it("compares glosses case-insensitively", () => {
    expect(matchTier(word("勉強", { glossEn: ["Study"] }), "study")).toBe(3);
  });

  it("is 2 when Hán Việt only matches without diacritics", () => {
    const ippan = word("一般", { hanViet: ["nhất bàn"] });
    expect(matchTier(ippan, "nhat ban")).toBe(2);
    expect(matchTier(ippan, "nhật bản")).toBe(2);
    expect(matchTier(ippan, "nhất bàn")).toBe(3);
  });

  it("is 1 when a Japanese form or romaji starts with the query", () => {
    expect(matchTier(word("勉強中", { kana: ["べんきょうちゅう"] }), "べんきょう")).toBe(1);
    expect(matchTier(word("食べる", { kana: ["たべる"] }), "たべ")).toBe(1);
    expect(matchTier(word("食べる", { kana: ["たべる"] }), "tabe")).toBe(1);
    expect(matchTier(word("勉強部屋"), "勉強")).toBe(1);
  });

  it("is 0 when the query only appears inside a form", () => {
    expect(matchTier(word("不勉強", { kana: ["ふべんきょう"] }), "べんきょう")).toBe(0);
    expect(matchTier(word("勉強", { glossEn: ["study"] }), "stu")).toBe(0);
  });
});

describe("rerank", () => {
  it("puts exact matches before longer words", () => {
    const hits = [
      word("勉強中", { kana: ["べんきょうちゅう"], romaji: ["benkyouchuu"], isCommon: true }),
      word("勉強", { kana: ["べんきょう"], romaji: ["benkyou"], isCommon: true }),
    ];
    expect(heads(rerank(hits, "benkyou"))).toEqual(["勉強", "勉強中"]);
  });

  it("prefers common words among equal matches", () => {
    const hits = [word("二本", { kana: ["にほん"] }), word("日本", { kana: ["にほん", "にっぽん"], isCommon: true })];
    expect(heads(rerank(hits, "にほん"))).toEqual(["日本", "二本"]);
  });

  it("ranks the reading typed with diacritics above diacritic-less matches", () => {
    const hits = [
      word("一般", { hanViet: ["nhất bàn"], isCommon: true }),
      word("日本", { hanViet: ["nhật bổn", "nhật bản"], isCommon: true }),
    ];
    expect(heads(rerank(hits, "nhật bản"))).toEqual(["日本", "一般"]);
  });

  it("orders prefix matches common first, then shortest", () => {
    const hits = [
      word("ベニヤ板", { kana: ["ベニヤいた"], isCommon: true }),
      word("食べ過ぎる", { kana: ["たべすぎる"], isCommon: true }),
      word("食べ歩き", { kana: ["たべあるき"] }),
      word("食べる", { kana: ["たべる"], isCommon: true }),
    ];
    expect(heads(rerank(hits, "たべ"))).toEqual(["食べる", "食べ過ぎる", "食べ歩き", "ベニヤ板"]);
  });

  it("keeps Meilisearch order as the final tie-break", () => {
    const hits = [word("A"), word("B"), word("C")];
    expect(heads(rerank(hits, "zzz"))).toEqual(["A", "B", "C"]);
  });
});

describe("bestHanViet", () => {
  const nihon = { hanViet: ["nhật bổn", "nhật bản"], hanVietPlain: ["nhat bon", "nhat ban"] };

  it("moves the typed reading to the front", () => {
    expect(bestHanViet(nihon, "nhật bản")).toEqual(["nhật bản", "nhật bổn"]);
    expect(bestHanViet(nihon, "Nhat Ban")).toEqual(["nhật bản", "nhật bổn"]);
  });

  it("keeps the original order otherwise", () => {
    expect(bestHanViet(nihon, "japan")).toEqual(nihon.hanViet);
  });
});

describe("kanjiMatchesHanViet", () => {
  const hoc = { hanViet: ["HỌC"], hanVietPlain: ["HOC"] };
  const hoc2 = { hanViet: ["HỘC"], hanVietPlain: ["HOC"] };

  it("requires the same tone when the query has diacritics", () => {
    expect(kanjiMatchesHanViet(hoc, "học")).toBe(true);
    expect(kanjiMatchesHanViet(hoc2, "học")).toBe(false);
  });

  it("matches any tone when the query has none", () => {
    expect(kanjiMatchesHanViet(hoc, "hoc")).toBe(true);
    expect(kanjiMatchesHanViet(hoc2, "hoc")).toBe(true);
  });
});

describe("isHanVietSyllable", () => {
  it("accepts one Latin syllable with or without diacritics", () => {
    expect(isHanVietSyllable("học")).toBe(true);
    expect(isHanVietSyllable(" Hoc ")).toBe(true);
  });

  it("rejects phrases, kana and digits", () => {
    expect(isHanVietSyllable("học sinh")).toBe(false);
    expect(isHanVietSyllable("がく")).toBe(false);
    expect(isHanVietSyllable("n5")).toBe(false);
  });
});
