/**
 * Translate JMdict English glosses of common words into Vietnamese with Claude.
 *
 * Results are stored in AIContent (type WORD_GLOSS_VI, status PENDING) and copied into
 * Sense.glossVi with viReviewed = false, so the UI labels them "AI" until a human approves.
 *
 *   npm run ai:translate -- --limit 100                 # sync run, try quality and cost first
 *   npm run ai:translate -- --limit 10000 --mode batch  # Message Batches API (50% price), submit
 *   npm run ai:translate -- --collect <batch_id>        # fetch results of a finished batch
 *
 * Options: --chunk 40 (words per request), --max-usd 5 (stop / refuse above this spend).
 * Env: ANTHROPIC_API_KEY (or an `ant auth login` profile), JAPEANS_AI_MODEL (e.g. claude-opus-5-5).
 */
import "dotenv/config"; // before src/lib/search creates its client
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildUserPayload,
  costUsd,
  MODEL_PRICES,
  previewOf,
  TRANSLATION_SCHEMA,
  TRANSLATION_SYSTEM_PROMPT,
  validateTranslations,
  type SenseVi,
  type TranslationInput,
} from "../../src/lib/translation";
import { meili, WORDS_INDEX } from "../../src/lib/search";
import { applyGlossVi, db, run } from "../import/lib";

const BATCH_DIR = path.resolve(__dirname, "../../data/ai-batches");
// Models that accept the server-side refusal fallback (sync mode only; not on the Batches API).
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function config() {
  const model = process.env.JAPEANS_AI_MODEL;
  if (!model) throw new Error("Set JAPEANS_AI_MODEL in .env (e.g. claude-opus-5-5).");
  const price = MODEL_PRICES[model];
  if (!price) throw new Error(`No price for ${model} in MODEL_PRICES (src/lib/translation.ts).`);
  return {
    model,
    price,
    limit: Number(arg("limit") ?? 100),
    chunk: Number(arg("chunk") ?? 40),
    maxUsd: Number(arg("max-usd") ?? 5),
    mode: (arg("mode") ?? "sync") as "sync" | "batch",
  };
}

/** Common words without a stored translation, shortest written form first (basic words). */
async function pickWords(limit: number): Promise<TranslationInput[]> {
  const ids = await db.$queryRaw<{ id: number }[]>`
    SELECT w.id FROM "Word" w
    WHERE w."isCommon"
      AND NOT EXISTS (
        SELECT 1 FROM "AIContent" a WHERE a.type = 'WORD_GLOSS_VI' AND a."targetKey" = 'word:' || w.id)
    ORDER BY (SELECT min(length(k.text)) FROM "WordKanjiForm" k WHERE k."wordId" = w.id) NULLS LAST, w.id
    LIMIT ${limit}`;
  const words = await db.word.findMany({
    where: { id: { in: ids.map((r) => r.id) } },
    include: {
      kanjiForms: { orderBy: { order: "asc" }, take: 1 },
      readings: { orderBy: { order: "asc" }, take: 1 },
      senses: { orderBy: { order: "asc" } },
    },
  });
  const byId = new Map(words.map((w) => [w.id, w]));
  return ids
    .map((r) => byId.get(r.id)!)
    .map((w) => ({
      id: w.id,
      headword: w.kanjiForms[0]?.text ?? w.readings[0]?.kana ?? "",
      reading: w.readings[0]?.kana ?? "",
      senses: w.senses.map((s) => ({ order: s.order, pos: s.partsOfSpeech, en: s.glossEn })),
    }));
}

function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}

function requestParams(model: string, words: TranslationInput[]) {
  return {
    model,
    max_tokens: 16000,
    system: TRANSLATION_SYSTEM_PROMPT,
    // Short dictionary translations: low effort keeps thinking (always on for Opus 5.5) cheap.
    output_config: { effort: "low" as const, format: { type: "json_schema" as const, schema: TRANSLATION_SCHEMA } },
    messages: [{ role: "user" as const, content: buildUserPayload(words) }],
  };
}

function textOf(content: Anthropic.ContentBlock[] | Anthropic.Beta.BetaContentBlock[]): string {
  return content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

/** Persist one chunk's translations: AIContent (source of truth) + Sense + search index. */
async function save(model: string, results: Map<number, SenseVi[]>) {
  if (!results.size) return;
  await db.$transaction(
    [...results].map(([id, senses]) =>
      db.aIContent.upsert({
        where: { type_targetKey: { type: "WORD_GLOSS_VI", targetKey: `word:${id}` } },
        create: { type: "WORD_GLOSS_VI", targetKey: `word:${id}`, content: JSON.stringify({ senses }), model },
        update: { content: JSON.stringify({ senses }), model, status: "PENDING" },
      }),
    ),
  );
  await applyGlossVi(
    [...results].flatMap(([wordId, senses]) => senses.map((s) => ({ wordId, order: s.order, vi: s.vi, reviewed: false }))),
  );

  // Keep Meilisearch in step so Vietnamese queries find these words right away.
  const words = await db.word.findMany({
    where: { id: { in: [...results.keys()] } },
    include: { senses: { orderBy: { order: "asc" } } },
  });
  await meili
    .index(WORDS_INDEX)
    .updateDocuments(
      words.map((w) => ({
        id: w.id,
        glossVi: w.senses.flatMap((s) => s.glossVi),
        preview: previewOf(w.senses),
        aiPreview: true,
      })),
    )
    .waitTask();
}

async function runSync(cfg: ReturnType<typeof config>, client: Anthropic, words: TranslationInput[]) {
  let spent = 0;
  let saved = 0;
  const failed: number[] = [];
  for (const [i, part] of chunks(words, cfg.chunk).entries()) {
    if (spent >= cfg.maxUsd) {
      console.log(`Stopped: spent $${spent.toFixed(3)} ≥ --max-usd ${cfg.maxUsd}`);
      break;
    }
    const params = requestParams(cfg.model, part);
    const response = FALLBACK_MODELS.has(cfg.model)
      ? await client.beta.messages.create({
          ...params,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        })
      : await client.messages.create(params);

    spent += costUsd(response.usage, cfg.price);
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      console.warn(`  chunk ${i + 1}: stop_reason ${response.stop_reason}, skipped`);
      failed.push(...part.map((w) => w.id));
      continue;
    }
    let raw: unknown = null;
    try {
      raw = JSON.parse(textOf(response.content));
    } catch {
      // counted as missing below
    }
    const { ok, missing } = validateTranslations(raw, part);
    await save(cfg.model, ok);
    saved += ok.size;
    failed.push(...missing);
    console.log(
      `  chunk ${i + 1}: ${ok.size}/${part.length} saved · in ${response.usage.input_tokens} / out ${response.usage.output_tokens} tok · total $${spent.toFixed(3)}`,
    );
  }
  console.log(`Saved ${saved} words, ${failed.length} failed (will be retried next run). Spent ≈ $${spent.toFixed(3)}.`);
}

async function submitBatch(cfg: ReturnType<typeof config>, client: Anthropic, words: TranslationInput[]) {
  const parts = chunks(words, cfg.chunk);
  // Estimate before spending: exact input tokens for one chunk, output assumed ≈ 1.5× input
  // (JSON plus low-effort thinking). Measure with a sync run first for a better ratio.
  const sample = await client.messages.countTokens({
    model: cfg.model,
    system: TRANSLATION_SYSTEM_PROMPT,
    messages: requestParams(cfg.model, parts[0]).messages,
  });
  const inputTokens = sample.input_tokens * parts.length;
  const estimate = costUsd({ input_tokens: inputTokens, output_tokens: inputTokens * 1.5 }, cfg.price, true);
  console.log(`Estimated cost for ${words.length} words in ${parts.length} requests: ≈ $${estimate.toFixed(2)} (batch price)`);
  if (estimate > cfg.maxUsd) {
    console.log(`Not submitted: estimate is above --max-usd ${cfg.maxUsd}. Raise it if this is intended.`);
    return;
  }

  const batch = await client.messages.batches.create({
    requests: parts.map((part, i) => ({ custom_id: `chunk-${i}`, params: requestParams(cfg.model, part) })),
  });
  fs.mkdirSync(BATCH_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(BATCH_DIR, `${batch.id}.json`),
    JSON.stringify({ model: cfg.model, chunks: parts.map((p) => p.map((w) => w.id)) }),
  );
  console.log(`Submitted batch ${batch.id}. When it has ended run: npm run ai:translate -- --collect ${batch.id}`);
}

async function collectBatch(client: Anthropic, batchId: string) {
  const file = path.join(BATCH_DIR, `${batchId}.json`);
  const meta = JSON.parse(fs.readFileSync(file, "utf8")) as { model: string; chunks: number[][] };
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended") {
    console.log(`Batch ${batchId} is ${batch.processing_status} (${batch.request_counts.processing} processing). Try later.`);
    return;
  }
  const price = MODEL_PRICES[meta.model];
  let spent = 0;
  let saved = 0;
  for await (const result of await client.messages.batches.results(batchId)) {
    const ids = meta.chunks[Number(result.custom_id.replace("chunk-", ""))];
    if (result.result.type !== "succeeded") {
      console.warn(`  ${result.custom_id}: ${result.result.type}`);
      continue;
    }
    const message = result.result.message;
    if (price) spent += costUsd(message.usage, price, true);
    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") continue;
    const words = await pickWordsByIds(ids);
    let raw: unknown = null;
    try {
      raw = JSON.parse(textOf(message.content));
    } catch {
      // missing
    }
    const { ok } = validateTranslations(raw, words);
    await save(meta.model, ok);
    saved += ok.size;
  }
  console.log(`Saved ${saved} words from batch ${batchId}. Spent ≈ $${spent.toFixed(3)}.`);
}

async function pickWordsByIds(ids: number[]): Promise<TranslationInput[]> {
  const words = await db.word.findMany({
    where: { id: { in: ids } },
    include: { senses: { orderBy: { order: "asc" } } },
  });
  return words.map((w) => ({
    id: w.id,
    headword: "",
    reading: "",
    senses: w.senses.map((s) => ({ order: s.order, pos: s.partsOfSpeech, en: s.glossEn })),
  }));
}

async function main() {
  const client = new Anthropic();
  const collect = arg("collect");
  if (collect) return collectBatch(client, collect);

  const cfg = config();
  const words = await pickWords(cfg.limit);
  console.log(`${words.length} words to translate with ${cfg.model} (${cfg.mode}, ${cfg.chunk} per request, cap $${cfg.maxUsd})`);
  if (!words.length) return;
  if (cfg.mode === "batch") return submitBatch(cfg, client, words);
  return runSync(cfg, client, words);
}

run(main);
