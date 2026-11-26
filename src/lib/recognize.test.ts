import { describe, expect, it } from "vitest";
import { makeTemplate, parseDrawing, recognize, samplePathD, shapeDistance, toShape, type Pt, type Strokes, type Template } from "./recognize";

const line = (ax: number, ay: number, bx: number, by: number): Pt[] =>
  Array.from({ length: 8 }, (_, i) => ({ x: ax + ((bx - ax) * i) / 7, y: ay + ((by - ay) * i) / 7 }));

// Simplified KanjiVG-like templates in a 109 box.
const CHARS: Record<string, Strokes> = {
  一: [line(15, 55, 95, 55)],
  二: [line(25, 35, 85, 35), line(15, 80, 95, 80)],
  三: [line(25, 25, 85, 25), line(30, 55, 80, 55), line(15, 88, 95, 88)],
  十: [line(15, 50, 95, 50), line(55, 10, 55, 100)],
  口: [line(25, 25, 25, 85), line(25, 25, 85, 25), line(85, 25, 85, 85), line(25, 85, 85, 85)],
  川: [line(25, 20, 20, 90), line(55, 25, 55, 80), line(85, 15, 85, 100)],
};
const templates: Template[] = Object.entries(CHARS).map(([character, s]) => makeTemplate(character, s, 100));
const top = (drawing: Strokes) => recognize(drawing, templates)[0]?.character;

/** Scale + move a drawing, as if written small in a corner of a 300px canvas. */
const transform = (s: Strokes, k: number, dx: number, dy: number): Strokes => s.map((st) => st.map((p) => ({ x: p.x * k + dx, y: p.y * k + dy })));

describe("recognize", () => {
  it("finds the drawn character", () => {
    expect(top(CHARS["三"])).toBe("三");
    expect(top(CHARS["口"])).toBe("口");
    expect(top(CHARS["川"])).toBe("川");
  });

  it("ignores size and position", () => {
    expect(top(transform(CHARS["十"], 1.7, 60, 10))).toBe("十");
    expect(top(transform(CHARS["二"], 0.6, 120, 140))).toBe("二");
  });

  it("tolerates wrong stroke order and reversed strokes", () => {
    const [h, v] = CHARS["十"];
    expect(top([v, h])).toBe("十");
    expect(top([[...h].reverse(), v])).toBe("十");
  });

  it("tolerates a hand-drawn wobble", () => {
    const wobbly = CHARS["川"].map((s) => s.map((p, i) => ({ x: p.x + (i % 2 ? 3 : -3), y: p.y })));
    expect(top(wobbly)).toBe("川");
  });

  it("only compares characters within two strokes", () => {
    const res = recognize(CHARS["一"], templates);
    expect(res.map((r) => r.character)).not.toContain("口");
  });

  it("returns nothing for an empty drawing", () => {
    expect(recognize([], templates)).toEqual([]);
  });
});

describe("shapeDistance", () => {
  it("is zero for identical shapes and larger for different ones", () => {
    const juu = toShape(CHARS["十"]);
    expect(shapeDistance(juu, juu)).toBeCloseTo(0);
    expect(shapeDistance(juu, toShape(CHARS["二"]))).toBeGreaterThan(0.1);
  });
});

describe("parseDrawing", () => {
  it("accepts [[x, y], ...] strokes", () => {
    expect(parseDrawing({ strokes: [[[1, 2], [3, 4]]] })).toEqual([[{ x: 1, y: 2 }, { x: 3, y: 4 }]]);
  });

  it("rejects malformed or oversized input", () => {
    expect(parseDrawing(null)).toBeNull();
    expect(parseDrawing({ strokes: [] })).toBeNull();
    expect(parseDrawing({ strokes: [[["a", 2]]] })).toBeNull();
    expect(parseDrawing({ strokes: [[[1, Infinity]]] })).toBeNull();
    expect(parseDrawing({ strokes: Array(41).fill([[1, 1]]) })).toBeNull();
  });

  it("caps points per stroke", () => {
    const many = Array.from({ length: 1000 }, (_, i) => [i, i]);
    expect(parseDrawing({ strokes: [many] })![0]).toHaveLength(400);
  });
});

describe("samplePathD", () => {
  it("samples absolute and relative cubic curves", () => {
    const abs = samplePathD("M10,10C20,10,30,10,40,10", 3);
    expect(abs).toHaveLength(4);
    expect(abs[0]).toEqual({ x: 10, y: 10 });
    expect(abs[3].x).toBeCloseTo(40);
    const rel = samplePathD("M10,10c10,0,20,0,30,0", 3);
    expect(rel[3].x).toBeCloseTo(40);
    expect(rel[3].y).toBeCloseTo(10);
  });

  it("reflects the previous control point for S / s", () => {
    const pts = samplePathD("M0,0C0,10,10,10,10,0S20,-10,20,0", 2);
    expect(pts.at(-1)).toEqual({ x: 20, y: 0 });
    // reflected control (10,-10) pulls the midpoint of the second curve below the axis
    expect(pts[3].y).toBeLessThan(0);
  });

  it("parses numbers written without separators (KanjiVG style)", () => {
    const pts = samplePathD("M31.5,53.25c1.74,0.26,4.91,0.29,6.64,0.14c12.73-1.13,30.48-2.43,40.67-2.32", 4);
    expect(pts.at(-1)!.x).toBeCloseTo(78.81, 1);
    expect(pts.at(-1)!.y).toBeCloseTo(51.07, 1);
  });
});
