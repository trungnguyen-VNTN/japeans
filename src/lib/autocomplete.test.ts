import { describe, expect, it } from "vitest";
import { moveActive, SUGGEST_MAX_QUERY, suggestQuery } from "./autocomplete";

describe("suggestQuery", () => {
  it("trims and normalises to NFC", () => {
    expect(suggestQuery("  học ".normalize("NFD"))).toBe("học".normalize("NFC"));
  });

  it("skips empty, single Latin letters and very long input", () => {
    expect(suggestQuery("   ")).toBeNull();
    expect(suggestQuery("a")).toBeNull();
    expect(suggestQuery("x".repeat(SUGGEST_MAX_QUERY + 1))).toBeNull();
  });

  it("allows a single kana or kanji", () => {
    expect(suggestQuery("学")).toBe("学");
    expect(suggestQuery("た")).toBe("た");
  });
});

describe("moveActive", () => {
  it("enters the list from the input", () => {
    expect(moveActive(-1, 1, 5)).toBe(0);
    expect(moveActive(-1, -1, 5)).toBe(4);
  });

  it("moves within the list", () => {
    expect(moveActive(1, 1, 5)).toBe(2);
    expect(moveActive(2, -1, 5)).toBe(1);
  });

  it("returns to the input past either end", () => {
    expect(moveActive(4, 1, 5)).toBe(-1);
    expect(moveActive(0, -1, 5)).toBe(-1);
  });

  it("stays in the input when there are no options", () => {
    expect(moveActive(-1, 1, 0)).toBe(-1);
  });
});
