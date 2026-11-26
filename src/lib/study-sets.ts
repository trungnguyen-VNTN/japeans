/** Pure helpers for study sets (Module H): validation, import parsing, visibility rules. */
import { z } from "zod";

export const LIMITS = {
  title: 120,
  description: 500,
  term: 100,
  reading: 100,
  definition: 500,
  minCards: 2,
  maxCards: 500,
  tags: 10,
  tag: 30,
} as const;

export const VISIBILITIES = ["PRIVATE", "UNLISTED", "PUBLIC"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<Visibility, { label: string; hint: string }> = {
  PRIVATE: { label: "Riêng tư", hint: "Chỉ mình bạn xem được" },
  UNLISTED: { label: "Không công khai", hint: "Ai có đường link đều xem được" },
  PUBLIC: { label: "Công khai", hint: "Hiện ở mục Khám phá" },
};

const text = (max: number, label: string) =>
  z
    .string()
    .transform((s) => s.normalize("NFC").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, `${label} tối đa ${max} ký tự`));

export const cardSchema = z.object({
  // Existing card id when editing: lets the server update in place and keep study progress.
  id: z.string().max(40).optional(),
  term: text(LIMITS.term, "Thuật ngữ").pipe(z.string().min(1, "Nhập thuật ngữ")),
  reading: text(LIMITS.reading, "Cách đọc").optional().default(""),
  definition: text(LIMITS.definition, "Định nghĩa").pipe(z.string().min(1, "Nhập định nghĩa")),
  wordId: z.number().int().positive().nullable().optional().default(null),
});

export const setSchema = z.object({
  title: text(LIMITS.title, "Tên học phần").pipe(z.string().min(1, "Nhập tên học phần")),
  description: text(LIMITS.description, "Mô tả").optional().default(""),
  visibility: z.enum(VISIBILITIES).default("PRIVATE"),
  tags: z
    .array(text(LIMITS.tag, "Thẻ"))
    .max(LIMITS.tags, `Tối đa ${LIMITS.tags} thẻ`)
    .default([])
    .transform((tags) => [...new Set(tags.filter(Boolean).map((t) => t.toLowerCase()))]),
  cards: z
    .array(cardSchema)
    .min(LIMITS.minCards, `Cần ít nhất ${LIMITS.minCards} thẻ`)
    .max(LIMITS.maxCards, `Tối đa ${LIMITS.maxCards} thẻ`),
});

export type CardInput = z.input<typeof cardSchema>;
export type SetInput = z.input<typeof setSchema>;
export type ValidSet = z.output<typeof setSchema>;

/** Field path → first error message, e.g. { "title": "…", "cards.3.definition": "…" }. */
export type FieldErrors = Record<string, string>;

export function validateSet(input: unknown): { ok: true; data: ValidSet } | { ok: false; errors: FieldErrors } {
  // Rows the user left completely empty are ignored rather than reported.
  const cleaned =
    input && typeof input === "object" && Array.isArray((input as SetInput).cards)
      ? {
          ...(input as SetInput),
          cards: (input as SetInput).cards.filter(
            (c) => `${c.term ?? ""}${c.reading ?? ""}${c.definition ?? ""}`.trim() !== "",
          ),
        }
      : input;
  const result = setSchema.safeParse(cleaned);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}

export type ImportedCard = { term: string; reading: string; definition: string };

/**
 * Parse pasted text into cards. One card per line; columns separated by a tab, " - ", " – ", "：", ":" or ",".
 * Two columns = term, definition. Three tab/colon columns = term, reading, definition.
 * Lines that cannot be split are returned in `skipped` (1-based line numbers).
 */
export function parseImport(textInput: string): { cards: ImportedCard[]; skipped: number[] } {
  const cards: ImportedCard[] = [];
  const skipped: number[] = [];
  const lines = textInput.normalize("NFC").split(/\r?\n/);

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    let parts: string[] | null = null;
    for (const sep of [/\t/, /\s+[-–—]\s+/, /\s*[：:]\s*/, /\s*,\s*/]) {
      const p = line.split(sep).map((s) => s.trim());
      if (p.length >= 2 && p.every(Boolean)) {
        parts = p;
        break;
      }
    }
    if (!parts) {
      skipped.push(i + 1);
      return;
    }
    if (parts.length >= 3) {
      cards.push({ term: parts[0], reading: parts[1], definition: parts.slice(2).join(", ") });
    } else {
      cards.push({ term: parts[0], reading: "", definition: parts[1] });
    }
  });

  return { cards, skipped };
}

/** Who may open a set: owners always; others only PUBLIC or UNLISTED sets. */
export function canView(set: { ownerId: string; visibility: Visibility }, viewerId: string | null): boolean {
  return set.ownerId === viewerId || set.visibility !== "PRIVATE";
}

export function canEdit(set: { ownerId: string }, viewerId: string | null): boolean {
  return viewerId !== null && set.ownerId === viewerId;
}
