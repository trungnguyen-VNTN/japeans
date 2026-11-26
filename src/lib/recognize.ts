/**
 * Handwritten kanji recognition by template matching against KanjiVG strokes
 * (pure, unit-tested in recognize.test.ts; templates are built server-side in recognize-data.ts).
 */

export type Pt = { x: number; y: number };
export type Strokes = Pt[][];
/** Each stroke resampled to POINTS points, all strokes normalised to the character's bounding box. */
export type Shape = Pt[][];

export const POINTS = 10;

const COST = {
  skip: 0.28, // a stroke present on one side only
  reversed: 0.04, // stroke drawn in the opposite direction
  unordered: 0.03, // per-stroke surcharge when the match ignores stroke order
};

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function resample(points: Pt[], n: number): Pt[] {
  if (points.length === 0) return [];
  const lens = [0];
  for (let i = 1; i < points.length; i++) lens.push(lens[i - 1] + dist(points[i - 1], points[i]));
  const total = lens[lens.length - 1];
  if (total === 0) return Array.from({ length: n }, () => ({ ...points[0] }));
  const out: Pt[] = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (j < points.length - 1 && lens[j] < target) j++;
    const seg = lens[j] - lens[j - 1] || 1;
    const t = Math.min(1, Math.max(0, (target - lens[j - 1]) / seg));
    out.push({ x: points[j - 1].x + t * (points[j].x - points[j - 1].x), y: points[j - 1].y + t * (points[j].y - points[j - 1].y) });
  }
  return out;
}

/** Normalise to a unit box (aspect kept, centred) and resample every stroke. */
export function toShape(strokes: Strokes): Shape {
  const all = strokes.flat();
  if (!all.length) return [];
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const scale = Math.max(maxX - minX, maxY - minY) || 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return strokes
    .filter((s) => s.length > 0)
    .map((s) => resample(s.map((p) => ({ x: (p.x - cx) / scale + 0.5, y: (p.y - cy) / scale + 0.5 })), POINTS));
}

/** Mean point distance between two resampled strokes; reversed direction costs a little extra. */
function strokeCost(a: Pt[], b: Pt[]): number {
  let fwd = 0;
  let rev = 0;
  for (let i = 0; i < POINTS; i++) {
    fwd += dist(a[i], b[i]);
    rev += dist(a[i], b[POINTS - 1 - i]);
  }
  return Math.min(fwd / POINTS, rev / POINTS + COST.reversed);
}

/** Ordered alignment (like edit distance): strokes may be missing or extra, but order is kept. */
function orderedCost(u: Shape, t: Shape, c: number[][]): number {
  const n = u.length;
  const m = t.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i + j) * COST.skip));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(dp[i - 1][j - 1] + c[i - 1][j - 1], dp[i - 1][j] + COST.skip, dp[i][j - 1] + COST.skip);
    }
  }
  return dp[n][m];
}

/** Greedy best-pair matching that ignores stroke order. */
function unorderedCost(u: Shape, t: Shape, c: number[][]): number {
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < u.length; i++) for (let j = 0; j < t.length; j++) pairs.push([c[i][j], i, j]);
  pairs.sort((a, b) => a[0] - b[0]);
  const usedU = new Set<number>();
  const usedT = new Set<number>();
  let total = 0;
  for (const [cost, i, j] of pairs) {
    if (usedU.has(i) || usedT.has(j)) continue;
    usedU.add(i);
    usedT.add(j);
    total += cost + COST.unordered;
  }
  return total + (u.length - usedU.size + t.length - usedT.size) * COST.skip;
}

/** Lower is more similar. Normalised by stroke count so characters of any size compare fairly. */
export function shapeDistance(user: Shape, template: Shape): number {
  if (!user.length || !template.length) return Infinity;
  const c = user.map((a) => template.map((b) => strokeCost(a, b)));
  const best = Math.min(orderedCost(user, template, c), unorderedCost(user, template, c));
  return best / Math.max(user.length, template.length);
}

const GRID = 6;

/** Coarse ink layout: share of sample points in each cell of a GRID×GRID grid. Used to prefilter. */
export function gridOf(shape: Shape): Float32Array {
  const g = new Float32Array(GRID * GRID);
  let n = 0;
  for (const s of shape) {
    for (const p of s) {
      const cx = Math.min(GRID - 1, Math.max(0, Math.floor(p.x * GRID)));
      const cy = Math.min(GRID - 1, Math.max(0, Math.floor(p.y * GRID)));
      g[cy * GRID + cx]++;
      n++;
    }
  }
  if (n) for (let i = 0; i < g.length; i++) g[i] /= n;
  return g;
}

function gridDistance(a: Float32Array, b: Float32Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  return d;
}

export type Template = { character: string; shape: Shape; grid: Float32Array; frequency: number | null };

export function makeTemplate(character: string, strokes: Strokes, frequency: number | null): Template {
  const shape = toShape(strokes);
  return { character, shape, grid: gridOf(shape), frequency };
}

/**
 * Rank templates for a drawing. Only characters within `maxStrokeDiff` strokes are compared; a cheap
 * ink-layout prefilter keeps the `shortlist` closest before full stroke matching; common characters
 * (newspaper frequency rank) win near-ties.
 */
export function recognize(drawing: Strokes, templates: Template[], limit = 10, maxStrokeDiff = 2, shortlist = 600) {
  const user = toShape(drawing);
  if (!user.length) return [];
  const userGrid = gridOf(user);
  const candidates = templates
    .filter((t) => Math.abs(t.shape.length - user.length) <= maxStrokeDiff)
    .map((t) => ({ t, g: gridDistance(userGrid, t.grid) }))
    .sort((a, b) => a.g - b.g)
    .slice(0, shortlist);
  return candidates
    .map(({ t }) => ({
      character: t.character,
      score: shapeDistance(user, t.shape) + (t.frequency ? (t.frequency / 2500) * 0.02 : 0.03),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

/**
 * Sample a KanjiVG path (`d` uses only M/m, C/c, S/s) into points: each cubic segment is
 * evaluated at `steps` evenly spaced t values (arc-length resampling happens later in toShape).
 */
export function samplePathD(d: string, steps = 6): Pt[] {
  const tokens = d.match(/[MmCcSs]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const pts: Pt[] = [];
  let i = 0;
  let cmd = "";
  let cur: Pt = { x: 0, y: 0 };
  let lastCtrl: Pt | null = null;
  const num = () => Number(tokens[i++]);
  const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt) => {
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const u = 1 - t;
      pts.push({
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      });
    }
  };
  while (i < tokens.length) {
    if (/[MmCcSs]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const base = rel ? cur : { x: 0, y: 0 };
    const at = (x: number, y: number) => ({ x: base.x + x, y: base.y + y });
    if (cmd === "M" || cmd === "m") {
      cur = at(num(), num());
      pts.push(cur);
      lastCtrl = null;
      cmd = rel ? "l-implicit" : "L-implicit"; // extra pairs after M are not used by KanjiVG
    } else if (cmd === "C" || cmd === "c") {
      const c1 = at(num(), num());
      const c2 = at(num(), num());
      const end = at(num(), num());
      cubic(cur, c1, c2, end);
      lastCtrl = c2;
      cur = end;
    } else if (cmd === "S" || cmd === "s") {
      const c1 = lastCtrl ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur;
      const c2 = at(num(), num());
      const end = at(num(), num());
      cubic(cur, c1, c2, end);
      lastCtrl = c2;
      cur = end;
    } else {
      i++; // unknown token: skip
    }
  }
  return pts;
}

/** Validate and clamp a drawing posted by the client. */
export function parseDrawing(body: unknown, limits = { strokes: 40, points: 400 }): Strokes | null {
  const strokes = (body as { strokes?: unknown })?.strokes;
  if (!Array.isArray(strokes) || strokes.length === 0 || strokes.length > limits.strokes) return null;
  const out: Strokes = [];
  for (const s of strokes) {
    if (!Array.isArray(s) || s.length === 0) return null;
    const pts: Pt[] = [];
    for (const p of s.slice(0, limits.points)) {
      if (!Array.isArray(p) || p.length < 2) return null;
      const [x, y] = p;
      if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return null;
      pts.push({ x, y });
    }
    out.push(pts);
  }
  return out;
}
