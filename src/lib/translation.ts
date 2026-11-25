/**
 * Pure helpers for AI translation of JMdict glosses into Vietnamese (unit-tested in translation.test.ts).
 * The script that calls the API lives in scripts/ai/translate-glosses.ts.
 */

export type TranslationInput = {
  id: number;
  headword: string;
  reading: string;
  senses: { order: number; pos: string[]; en: string[] }[];
};

export type SenseVi = { order: number; vi: string[] };

export const MAX_VI_PER_SENSE = 5;

export const TRANSLATION_SYSTEM_PROMPT = `Bạn là biên tập viên từ điển Nhật–Việt. Với mỗi mục từ tiếng Nhật, bạn nhận cách viết, cách đọc và các nghĩa tiếng Anh (gloss) của từ điển JMdict, theo đúng thứ tự nghĩa.

Viết nghĩa tiếng Việt cho từng nghĩa:
- Mỗi nghĩa: 1–4 từ hoặc cụm từ tiếng Việt ngắn, kiểu mục từ điển (ví dụ "học tập", "sự chăm chỉ"), không viết câu giải thích dài.
- Chỉ dịch điều có trong gloss tiếng Anh và cách đọc; không thêm nghĩa mới, ví dụ hay ghi chú ngữ pháp.
- Giữ nguyên số thứ tự (order) của từng nghĩa; mỗi nghĩa ở đầu vào phải có đúng một nghĩa ở đầu ra.
- Ưu tiên từ Hán Việt khi người Việt thật sự dùng chúng; nếu không, dùng từ thuần Việt tự nhiên.
- Phần trong ngoặc của gloss (phạm vi, ngữ cảnh) dịch sang tiếng Việt và giữ trong ngoặc.
- Tên riêng, thuật ngữ khoa học: dùng tên tiếng Việt thông dụng nếu có, nếu không thì giữ nguyên.
- Không dùng romaji, không lặp lại chữ Nhật.`;

/** JSON schema for structured outputs (objects need additionalProperties: false). */
export const TRANSLATION_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          senses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                order: { type: "integer" },
                vi: { type: "array", items: { type: "string" } },
              },
              required: ["order", "vi"],
              additionalProperties: false,
            },
          },
        },
        required: ["id", "senses"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

/** Compact JSON payload for one request (one chunk of words). */
export function buildUserPayload(words: TranslationInput[]): string {
  return JSON.stringify({
    items: words.map((w) => ({
      id: w.id,
      word: w.headword,
      reading: w.reading,
      senses: w.senses.map((s) => ({ order: s.order, pos: s.pos, en: s.en })),
    })),
  });
}

const clean = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();

/**
 * Keep only well-formed translations for words and sense orders we asked about.
 * Returns translations per word id plus the ids that came back missing or unusable.
 */
export function validateTranslations(
  raw: unknown,
  inputs: TranslationInput[],
): { ok: Map<number, SenseVi[]>; missing: number[] } {
  const wanted = new Map(inputs.map((w) => [w.id, new Set(w.senses.map((s) => s.order))]));
  const ok = new Map<number, SenseVi[]>();
  const items = (raw as { items?: unknown })?.items;

  if (Array.isArray(items)) {
    for (const item of items) {
      const id = (item as { id?: unknown })?.id;
      const senses = (item as { senses?: unknown })?.senses;
      if (typeof id !== "number" || !wanted.has(id) || ok.has(id) || !Array.isArray(senses)) continue;
      const orders = wanted.get(id)!;
      const result: SenseVi[] = [];
      for (const s of senses) {
        const order = (s as { order?: unknown })?.order;
        const vi = (s as { vi?: unknown })?.vi;
        if (typeof order !== "number" || !orders.has(order) || !Array.isArray(vi)) continue;
        if (result.some((r) => r.order === order)) continue;
        const values = [...new Set(vi.filter((v): v is string => typeof v === "string").map(clean))]
          .filter(Boolean)
          .slice(0, MAX_VI_PER_SENSE);
        if (values.length) result.push({ order, vi: values });
      }
      // A word counts only if every requested sense got a translation.
      if (result.length === orders.size) ok.set(id, result.sort((a, b) => a.order - b.order));
    }
  }

  return { ok, missing: inputs.map((w) => w.id).filter((id) => !ok.has(id)) };
}

export type Price = { inputPerM: number; outputPerM: number };

/** USD per 1M tokens (standard API rates, 2026-11). Batch API is billed at 50%. */
export const MODEL_PRICES: Record<string, Price> = {
  "claude-opus-5-5": { inputPerM: 4, outputPerM: 20 },
  "claude-sonnet-5-5": { inputPerM: 2, outputPerM: 10 },
  "claude-haiku-5-5": { inputPerM: 0.1, outputPerM: 0.5 },
};

export function costUsd(
  usage: { input_tokens: number; output_tokens: number },
  price: Price,
  batch = false,
): number {
  const usd = (usage.input_tokens * price.inputPerM + usage.output_tokens * price.outputPerM) / 1_000_000;
  return batch ? usd / 2 : usd;
}

/** Search-result preview line: first Vietnamese meaning when present, else first English glosses. */
export function previewOf(senses: { glossVi: string[]; glossEn: string[] }[]): string {
  return senses
    .slice(0, 3)
    .map((s) => s.glossVi.slice(0, 2).join(", ") || s.glossEn.slice(0, 2).join(", "))
    .join("; ");
}
