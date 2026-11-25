import { describe, expect, it } from "vitest";
import {
  buildUserPayload,
  costUsd,
  MAX_VI_PER_SENSE,
  previewOf,
  validateTranslations,
  type TranslationInput,
} from "./translation";

const inputs: TranslationInput[] = [
  {
    id: 1512670,
    headword: "勉強",
    reading: "べんきょう",
    senses: [
      { order: 0, pos: ["n", "vs"], en: ["study"] },
      { order: 1, pos: ["n"], en: ["diligence", "working hard"] },
    ],
  },
  { id: 1582710, headword: "日本", reading: "にほん", senses: [{ order: 0, pos: ["n"], en: ["Japan"] }] },
];

describe("buildUserPayload", () => {
  it("serialises words with their sense order", () => {
    const parsed = JSON.parse(buildUserPayload(inputs));
    expect(parsed.items[0]).toEqual({
      id: 1512670,
      word: "勉強",
      reading: "べんきょう",
      senses: [
        { order: 0, pos: ["n", "vs"], en: ["study"] },
        { order: 1, pos: ["n"], en: ["diligence", "working hard"] },
      ],
    });
  });
});

describe("validateTranslations", () => {
  it("accepts complete translations and trims / de-duplicates values", () => {
    const raw = {
      items: [
        {
          id: 1512670,
          senses: [
            { order: 1, vi: [" sự chăm chỉ ", "sự chăm chỉ", ""] },
            { order: 0, vi: ["học tập", "việc học"] },
          ],
        },
        { id: 1582710, senses: [{ order: 0, vi: ["Nhật Bản"] }] },
      ],
    };
    const { ok, missing } = validateTranslations(raw, inputs);
    expect(missing).toEqual([]);
    expect(ok.get(1512670)).toEqual([
      { order: 0, vi: ["học tập", "việc học"] },
      { order: 1, vi: ["sự chăm chỉ"] },
    ]);
  });

  it("rejects a word when any sense is missing or empty", () => {
    const raw = {
      items: [
        { id: 1512670, senses: [{ order: 0, vi: ["học tập"] }, { order: 1, vi: ["  "] }] },
        { id: 1582710, senses: [{ order: 0, vi: ["Nhật Bản"] }] },
      ],
    };
    const { ok, missing } = validateTranslations(raw, inputs);
    expect(missing).toEqual([1512670]);
    expect(ok.has(1582710)).toBe(true);
  });

  it("ignores unknown ids, unknown sense orders and duplicates", () => {
    const raw = {
      items: [
        { id: 999, senses: [{ order: 0, vi: ["x"] }] },
        { id: 1582710, senses: [{ order: 0, vi: ["Nhật Bản"] }, { order: 0, vi: ["khác"] }, { order: 7, vi: ["y"] }] },
        { id: 1582710, senses: [{ order: 0, vi: ["lần hai"] }] },
      ],
    };
    const { ok } = validateTranslations(raw, inputs);
    expect([...ok.keys()]).toEqual([1582710]);
    expect(ok.get(1582710)).toEqual([{ order: 0, vi: ["Nhật Bản"] }]);
  });

  it("caps the number of meanings per sense and normalises to NFC", () => {
    const many = Array.from({ length: 9 }, (_, i) => `nghĩa ${i}`);
    const raw = { items: [{ id: 1582710, senses: [{ order: 0, vi: ["Nhật Bản".normalize("NFD"), ...many] }] }] };
    const vi = validateTranslations(raw, inputs).ok.get(1582710)![0].vi;
    expect(vi).toHaveLength(MAX_VI_PER_SENSE);
    expect(vi[0]).toBe("Nhật Bản".normalize("NFC"));
  });

  it("treats malformed output as all missing", () => {
    expect(validateTranslations(null, inputs).missing).toEqual([1512670, 1582710]);
    expect(validateTranslations({ items: "x" }, inputs).missing).toHaveLength(2);
  });
});

describe("costUsd", () => {
  const price = { inputPerM: 4, outputPerM: 20 };

  it("prices input and output tokens", () => {
    expect(costUsd({ input_tokens: 1_000_000, output_tokens: 100_000 }, price)).toBeCloseTo(6);
  });

  it("halves the price for the Batch API", () => {
    expect(costUsd({ input_tokens: 1_000_000, output_tokens: 100_000 }, price, true)).toBeCloseTo(3);
  });
});

describe("previewOf", () => {
  it("prefers Vietnamese and falls back to English per sense", () => {
    expect(
      previewOf([
        { glossVi: ["học tập", "việc học", "x"], glossEn: ["study"] },
        { glossVi: [], glossEn: ["diligence", "working hard", "z"] },
      ]),
    ).toBe("học tập, việc học; diligence, working hard");
  });
});
