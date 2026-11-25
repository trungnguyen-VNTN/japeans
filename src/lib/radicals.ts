/** Pure helpers for "find kanji by radicals" (unit-tested in radicals.test.ts). */

export const MAX_SELECTED_RADICALS = 8;

/** "12,5,12,x" → [5, 12]: unique positive integers, sorted, capped. */
export function parseRadicalIds(param: string | string[] | undefined): number[] {
  const raw = Array.isArray(param) ? param.join(",") : (param ?? "");
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].sort((a, b) => a - b).slice(0, MAX_SELECTED_RADICALS);
}

/** Add the id if missing, remove it if present; result is sorted (stable URLs). */
export function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].sort((a, b) => a - b);
}

/** Group items by stroke count, ascending. */
export function groupByStrokes<T extends { strokeCount: number }>(items: T[]): [number, T[]][] {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    if (!groups.has(item.strokeCount)) groups.set(item.strokeCount, []);
    groups.get(item.strokeCount)!.push(item);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}
