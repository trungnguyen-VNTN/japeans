import { describe, expect, it } from "vitest";
import { checkStroke, resample, simplify, strokeLength, type Stroke } from "./handwriting";

/** Straight line from a to b with `n` points. */
const line = (ax: number, ay: number, bx: number, by: number, n = 10): Stroke =>
  Array.from({ length: n }, (_, i) => ({ x: ax + ((bx - ax) * i) / (n - 1), y: ay + ((by - ay) * i) / (n - 1) }));

// 十: horizontal stroke, then vertical stroke.
const JUU: Stroke[] = [line(15, 50, 95, 50), line(55, 10, 55, 100)];

describe("resample", () => {
  it("returns evenly spaced points along the stroke", () => {
    const pts = resample(line(0, 0, 90, 0, 3), 10);
    expect(pts).toHaveLength(10);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[9].x).toBeCloseTo(90);
    expect(pts[1].x).toBeCloseTo(10);
  });

  it("handles single points and empty input", () => {
    expect(resample([{ x: 5, y: 5 }], 4)).toEqual(Array(4).fill({ x: 5, y: 5 }));
    expect(resample([], 4)).toEqual([]);
  });
});

describe("checkStroke", () => {
  it("accepts a stroke close to the expected one", () => {
    expect(checkStroke(line(18, 54, 92, 47, 25), JUU, 0)).toEqual({ ok: true });
  });

  it("accepts a slightly wobbly hand-drawn stroke", () => {
    const wobbly = line(16, 50, 94, 50, 30).map((p, i) => ({ x: p.x, y: p.y + (i % 2 ? 3 : -3) }));
    expect(checkStroke(wobbly, JUU, 0).ok).toBe(true);
  });

  it("detects a stroke drawn backwards", () => {
    expect(checkStroke(line(95, 50, 15, 50), JUU, 0)).toEqual({ ok: false, reason: "reversed" });
  });

  it("detects a correct stroke written out of order", () => {
    expect(checkStroke(line(55, 10, 55, 100), JUU, 0)).toEqual({ ok: false, reason: "wrong-order" });
  });

  it("rejects strokes in the wrong place", () => {
    expect(checkStroke(line(15, 95, 95, 95), JUU, 0)).toEqual({ ok: false, reason: "wrong-shape" });
  });

  it("ignores taps on long strokes but accepts dots for dot strokes", () => {
    expect(checkStroke([{ x: 50, y: 50 }], JUU, 0)).toEqual({ ok: false, reason: "too-short" });
    const dot: Stroke[] = [line(50, 20, 54, 26, 4)];
    expect(checkStroke(line(51, 21, 54, 25, 3), dot, 0).ok).toBe(true);
  });

  it("returns wrong-shape when there is no stroke left to write", () => {
    expect(checkStroke(line(15, 50, 95, 50), JUU, 2)).toEqual({ ok: false, reason: "wrong-shape" });
  });
});

describe("simplify / strokeLength", () => {
  it("drops points closer than the gap but keeps both ends", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 3, y: 0 },
      { x: 3.2, y: 0 },
    ];
    expect(simplify(pts)).toEqual([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3.2, y: 0 }]);
    expect(strokeLength(line(0, 0, 30, 40))).toBeCloseTo(50);
  });
});
