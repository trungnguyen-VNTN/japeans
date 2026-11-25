/** Pure helpers for the search box autocomplete (unit-tested in autocomplete.test.ts). */

export const SUGGEST_DEBOUNCE_MS = 200;
export const SUGGEST_LIMIT = 8;
export const SUGGEST_MAX_QUERY = 50;

/** Normalised query to send, or null when no request should be made. */
export function suggestQuery(input: string): string | null {
  const q = input.trim().normalize("NFC");
  if (!q || q.length > SUGGEST_MAX_QUERY) return null;
  // A single Latin letter matches too much to be useful.
  if (/^[a-z]$/i.test(q)) return null;
  return q;
}

/**
 * Arrow-key movement through `length` options. -1 means "no option active" (focus stays in the
 * input); moving past either end returns to -1, the way native comboboxes behave.
 */
export function moveActive(current: number, delta: 1 | -1, length: number): number {
  if (length === 0) return -1;
  if (current === -1) return delta === 1 ? 0 : length - 1;
  const next = current + delta;
  return next < 0 || next >= length ? -1 : next;
}
