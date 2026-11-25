import { describe, expect, it } from "vitest";
import { hanVietOf, isKanji, kanjiIn, stripVietnamese } from "./text";

describe("stripVietnamese", () => {
  it("removes tones and vowel marks", () => {
    expect(stripVietnamese("Nhật Bản")).toBe("Nhat Ban");
    expect(stripVietnamese("học sinh")).toBe("hoc sinh");
    expect(stripVietnamese("thượng")).toBe("thuong");
  });

  it("maps đ / Đ to d / D", () => {
    expect(stripVietnamese("đại Đông")).toBe("dai Dong");
  });

  it("handles decomposed (NFD) input", () => {
    expect(stripVietnamese("học".normalize("NFD"))).toBe("hoc");
  });
});

describe("isKanji / kanjiIn", () => {
  it("recognises kanji and the iteration mark", () => {
    expect(isKanji("学")).toBe(true);
    expect(isKanji("々")).toBe(true);
    expect(isKanji("あ")).toBe(false);
    expect(isKanji("カ")).toBe(false);
    expect(isKanji("a")).toBe(false);
  });

  it("returns unique kanji in order", () => {
    expect(kanjiIn("学生が学ぶ")).toEqual(["学", "生"]);
    expect(kanjiIn("ひらがな")).toEqual([]);
  });
});

describe("hanVietOf", () => {
  const map = new Map<string, string[]>([
    ["学", ["HỌC"]],
    ["生", ["SINH", "SANH"]],
    ["日", ["NHẬT"]],
    ["本", ["BẢN", "BỔN"]],
    ["人", ["NHÂN"]],
  ]);

  it("combines every reading, first reading first", () => {
    expect(hanVietOf("学生", map)).toEqual(["học sinh", "học sanh"]);
    expect(hanVietOf("日本", map)).toEqual(["nhật bản", "nhật bổn"]);
  });

  it("repeats the previous reading for 々", () => {
    expect(hanVietOf("人々", map)).toEqual(["nhân nhân"]);
  });

  it("returns nothing for words with kana or unknown kanji", () => {
    expect(hanVietOf("食べる", map)).toEqual([]);
    expect(hanVietOf("学校", map)).toEqual([]);
    expect(hanVietOf("", map)).toEqual([]);
  });

  it("caps the number of combinations", () => {
    const many = new Map<string, string[]>([["学", ["A", "B", "C"]]]);
    expect(hanVietOf("学学学", many, 4)).toHaveLength(4);
  });

  it("normalises output to NFC", () => {
    const nfd = new Map([["学", ["HỌC".normalize("NFD")]]]);
    expect(hanVietOf("学", nfd)[0]).toBe("học".normalize("NFC"));
  });
});
