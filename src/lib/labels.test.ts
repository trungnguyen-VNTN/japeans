import { describe, expect, it } from "vitest";
import { gradeLabel, miscLabel, posLabel, posLabels } from "./labels";

describe("posLabel", () => {
  it("translates known JMdict tags", () => {
    expect(posLabel("n")).toBe("danh từ");
    expect(posLabel("adj-i")).toBe("tính từ -い");
    expect(posLabel("v1")).toBe("động từ nhóm 2");
  });

  it("groups every godan verb class", () => {
    expect(posLabel("v5u")).toBe("động từ nhóm 1");
    expect(posLabel("v5k-s")).toBe("động từ nhóm 1");
  });

  it("falls back to the raw code", () => {
    expect(posLabel("unknown-tag")).toBe("unknown-tag");
  });
});

describe("posLabels", () => {
  it("de-duplicates labels", () => {
    expect(posLabels(["v5u", "v5k", "vt"])).toEqual(["động từ nhóm 1", "tha động từ"]);
  });
});

describe("miscLabel", () => {
  it("translates usage notes", () => {
    expect(miscLabel("uk")).toBe("thường viết bằng kana");
    expect(miscLabel("hon")).toBe("tôn kính ngữ");
  });
});

describe("gradeLabel", () => {
  it("describes school grades", () => {
    expect(gradeLabel(1)).toBe("Tiểu học lớp 1");
    expect(gradeLabel(8)).toBe("Trung học (Jōyō)");
    expect(gradeLabel(9)).toBe("Jinmeiyō (tên người)");
    expect(gradeLabel(null)).toBeNull();
  });
});
