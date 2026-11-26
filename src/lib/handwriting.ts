/**
 * Pure stroke checking for kanji writing practice (unit-tested in handwriting.test.ts).
 * Coordinates are in KanjiVG's 109×109 box.
 */

export type Point = { x: number; y: number };
export type Stroke = Point[];

export const BOX = 109;
const SAMPLES = 32;

/** Leniency in KanjiVG units (the box is 109 wide). */
export const TOLERANCE = {
  avgDistance: 17, // mean distance between matching samples
  endpoint: 26, // start / end point distance
};

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function strokeLength(points: Stroke): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

/** Resample a polyline to `n` points evenly spaced along its length. */
export function resample(points: Stroke, n = SAMPLES): Stroke {
  if (points.length === 0) return [];
  const total = strokeLength(points);
  if (points.length === 1 || total === 0) return Array.from({ length: n }, () => ({ ...points[0] }));

  const step = total / (n - 1);
  const out: Stroke = [{ ...points[0] }];
  let acc = 0;
  let prev = points[0];
  for (let i = 1; i < points.length && out.length < n; i++) {
    let cur = points[i];
    let seg = dist(prev, cur);
    while (seg > 0 && acc + seg >= step && out.length < n) {
      const t = (step - acc) / seg;
      const p = { x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) };
      out.push(p);
      prev = p;
      seg = dist(prev, cur);
      acc = 0;
    }
    acc += seg;
    prev = cur;
    cur = points[i];
  }
  while (out.length < n) out.push({ ...points[points.length - 1] });
  return out;
}

function meanDistance(a: Stroke, b: Stroke): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += dist(a[i], b[i]);
  return sum / a.length;
}

export type StrokeVerdict =
  | { ok: true }
  | { ok: false; reason: "reversed" | "wrong-order" | "wrong-shape" | "too-short" };

function similar(user: Stroke, expected: Stroke): boolean {
  const u = resample(user);
  const e = resample(expected);
  return (
    dist(u[0], e[0]) <= TOLERANCE.endpoint &&
    dist(u[u.length - 1], e[e.length - 1]) <= TOLERANCE.endpoint &&
    meanDistance(u, e) <= TOLERANCE.avgDistance
  );
}

/**
 * Check one drawn stroke against the stroke expected next (`expected[index]`).
 * Also tells apart a stroke drawn backwards and a correct stroke written out of order.
 */
export function checkStroke(user: Stroke, expected: Stroke[], index: number): StrokeVerdict {
  const target = expected[index];
  if (!target) return { ok: false, reason: "wrong-shape" };
  // Taps and tiny wiggles are ignored unless the expected stroke is itself a dot.
  if (strokeLength(user) < 4 && strokeLength(target) > 12) return { ok: false, reason: "too-short" };
  if (similar(user, target)) return { ok: true };
  if (similar([...user].reverse(), target)) return { ok: false, reason: "reversed" };
  if (expected.some((s, i) => i > index && similar(user, s))) return { ok: false, reason: "wrong-order" };
  return { ok: false, reason: "wrong-shape" };
}

export const VERDICT_MESSAGES: Record<Exclude<StrokeVerdict, { ok: true }>["reason"], string> = {
  reversed: "Ngược chiều: viết lại nét này theo chiều ngược lại.",
  "wrong-order": "Sai thứ tự: nét này viết sau. Hãy viết nét đang được gợi ý.",
  "wrong-shape": "Chưa đúng vị trí hoặc hình dạng nét. Thử lại nhé.",
  "too-short": "Nét quá ngắn. Kéo dài nét theo chữ mẫu.",
};

/** Simplify a raw pointer trail: drop points closer than `minGap` units to the previous kept point. */
export function simplify(points: Stroke, minGap = 1.5): Stroke {
  if (points.length <= 2) return points;
  const out: Stroke = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    if (dist(points[i], out[out.length - 1]) >= minGap) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}
