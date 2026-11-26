import { describe, expect, it } from "vitest";
import { canEdit, canView, LIMITS, parseImport, validateSet } from "./study-sets";

const card = (term: string, definition: string, reading = "") => ({ term, reading, definition });

describe("validateSet", () => {
  it("accepts a valid set and normalises text", () => {
    const res = validateSet({
      title: "  N5   động từ ",
      visibility: "PUBLIC",
      tags: ["JLPT", "jlpt", " N5 "],
      cards: [card("食べる", "ăn", "たべる"), card("飲む", " uống ")],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.title).toBe("N5 động từ");
    expect(res.data.tags).toEqual(["jlpt", "n5"]);
    expect(res.data.cards[1]).toEqual({ term: "飲む", reading: "", definition: "uống", wordId: null });
    expect(res.data.description).toBe("");
  });

  it("defaults visibility to private", () => {
    const res = validateSet({ title: "x", cards: [card("a", "b"), card("c", "d")] });
    expect(res.ok && res.data.visibility).toBe("PRIVATE");
  });

  it("ignores completely empty rows", () => {
    const res = validateSet({ title: "x", cards: [card("a", "b"), card(" ", " "), card("c", "d")] });
    expect(res.ok && res.data.cards).toHaveLength(2);
  });

  it("reports errors by field path", () => {
    const res = validateSet({ title: " ", cards: [card("a", "b"), card("c", "")] });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.title).toBe("Nhập tên học phần");
    expect(res.errors["cards.1.definition"]).toBe("Nhập định nghĩa");
  });

  it("enforces card count and length limits", () => {
    const tooFew = validateSet({ title: "x", cards: [card("a", "b")] });
    expect(!tooFew.ok && tooFew.errors.cards).toMatch(/ít nhất/);
    const long = validateSet({ title: "x".repeat(LIMITS.title + 1), cards: [card("a", "b"), card("c", "d")] });
    expect(!long.ok && long.errors.title).toMatch(/tối đa/);
  });

  it("rejects unknown visibility and non-object input", () => {
    expect(validateSet({ title: "x", visibility: "SECRET", cards: [card("a", "b"), card("c", "d")] }).ok).toBe(false);
    expect(validateSet(null).ok).toBe(false);
  });
});

describe("parseImport", () => {
  it("splits tab, dash, colon and comma separated lines", () => {
    const { cards, skipped } = parseImport("食べる\tăn\n飲む - uống\n見る：nhìn, xem\n行く,đi\n\n");
    expect(cards).toEqual([
      card("食べる", "ăn"),
      card("飲む", "uống"),
      card("見る", "nhìn, xem"),
      card("行く", "đi"),
    ]);
    expect(skipped).toEqual([]);
  });

  it("reads term, reading, definition from three tab columns", () => {
    expect(parseImport("勉強\tべんきょう\thọc tập").cards).toEqual([card("勉強", "học tập", "べんきょう")]);
  });

  it("keeps hyphenated words intact and reports unsplittable lines", () => {
    const { cards, skipped } = parseImport("e-mail - thư điện tử\nchỉ một cột\n先生\tgiáo viên");
    expect(cards).toEqual([card("e-mail", "thư điện tử"), card("先生", "giáo viên")]);
    expect(skipped).toEqual([2]);
  });
});

describe("canView / canEdit", () => {
  const set = (visibility: "PRIVATE" | "UNLISTED" | "PUBLIC") => ({ ownerId: "u1", visibility });

  it("lets owners see and edit everything", () => {
    expect(canView(set("PRIVATE"), "u1")).toBe(true);
    expect(canEdit(set("PRIVATE"), "u1")).toBe(true);
  });

  it("hides private sets from others and anonymous visitors", () => {
    expect(canView(set("PRIVATE"), "u2")).toBe(false);
    expect(canView(set("PRIVATE"), null)).toBe(false);
    expect(canView(set("UNLISTED"), null)).toBe(true);
    expect(canView(set("PUBLIC"), "u2")).toBe(true);
  });

  it("never lets non-owners edit", () => {
    expect(canEdit(set("PUBLIC"), "u2")).toBe(false);
    expect(canEdit(set("PUBLIC"), null)).toBe(false);
  });
});
