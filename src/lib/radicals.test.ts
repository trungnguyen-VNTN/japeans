import { describe, expect, it } from "vitest";
import { groupByStrokes, MAX_SELECTED_RADICALS, parseRadicalIds, toggleId } from "./radicals";

describe("parseRadicalIds", () => {
  it("parses, de-duplicates and sorts ids", () => {
    expect(parseRadicalIds("12,5,12")).toEqual([5, 12]);
  });

  it("ignores junk and non-positive values", () => {
    expect(parseRadicalIds("a, 3 ,-1,0,2.5,,7")).toEqual([3, 7]);
    expect(parseRadicalIds(undefined)).toEqual([]);
    expect(parseRadicalIds("")).toEqual([]);
  });

  it("accepts repeated query params", () => {
    expect(parseRadicalIds(["4", "1,2"])).toEqual([1, 2, 4]);
  });

  it("caps the selection", () => {
    const many = Array.from({ length: 20 }, (_, i) => i + 1).join(",");
    expect(parseRadicalIds(many)).toHaveLength(MAX_SELECTED_RADICALS);
  });
});

describe("toggleId", () => {
  it("adds and keeps order", () => {
    expect(toggleId([1, 9], 4)).toEqual([1, 4, 9]);
  });

  it("removes an existing id", () => {
    expect(toggleId([1, 4, 9], 4)).toEqual([1, 9]);
  });
});

describe("groupByStrokes", () => {
  it("groups by stroke count in ascending order, keeping item order", () => {
    const items = [
      { c: "口", strokeCount: 3 },
      { c: "一", strokeCount: 1 },
      { c: "女", strokeCount: 3 },
    ];
    expect(groupByStrokes(items)).toEqual([
      [1, [{ c: "一", strokeCount: 1 }]],
      [
        3,
        [
          { c: "口", strokeCount: 3 },
          { c: "女", strokeCount: 3 },
        ],
      ],
    ]);
  });
});
