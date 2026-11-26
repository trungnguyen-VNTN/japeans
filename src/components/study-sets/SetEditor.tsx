"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CircleNotch, Plus, Trash, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { saveSet } from "@/app/hoc-phan/actions";
import { TermField } from "@/components/study-sets/TermField";
import {
  LIMITS,
  parseImport,
  VISIBILITIES,
  VISIBILITY_LABELS,
  type FieldErrors,
  type Visibility,
} from "@/lib/study-sets";

export type EditorCard = { key: string; id?: string; term: string; reading: string; definition: string; wordId: number | null };

export type EditorInitial = {
  title: string;
  description: string;
  visibility: Visibility;
  tags: string[];
  cards: Omit<EditorCard, "key">[];
};

let keySeq = 0;
const newKey = () => `c${++keySeq}`;
const blankCard = (): EditorCard => ({ key: newKey(), term: "", reading: "", definition: "", wordId: null });

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-card-foreground">
        {label}
        {required && <span aria-hidden className="text-destructive"> *</span>}
        {required && <span className="sr-only"> (bắt buộc)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function SetEditor({ setId, initial }: { setId: string | null; initial: EditorInitial }) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility);
  const [cards, setCards] = useState<EditorCard[]>(() => {
    const list = initial.cards.map((c) => ({ ...c, key: newKey() }));
    while (list.length < 2) list.push(blankCard());
    return list;
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [importText, setImportText] = useState("");
  const [pending, startTransition] = useTransition();
  const summaryRef = useRef<HTMLDivElement>(null);

  const imported = importText.trim() ? parseImport(importText) : null;

  function updateCard(key: string, patch: Partial<EditorCard>) {
    setCards((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function moveCard(index: number, delta: -1 | 1) {
    setCards((list) => {
      const next = [...list];
      const [card] = next.splice(index, 1);
      next.splice(index + delta, 0, card);
      return next;
    });
  }

  function addImported() {
    if (!imported?.cards.length) return;
    setCards((list) => [
      ...list.filter((c) => `${c.term}${c.reading}${c.definition}`.trim() !== ""),
      ...imported.cards.map((c) => ({ ...c, key: newKey(), wordId: null })),
    ]);
    setImportText("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveSet(setId, {
        title,
        description,
        visibility,
        tags: initial.tags,
        cards: cards.map(({ id, term, reading, definition, wordId }) => ({ id, term, reading, definition, wordId })),
      });
      // Success redirects; we only get here with errors.
      if (res && !res.ok) {
        setErrors(res.errors);
        requestAnimationFrame(() => summaryRef.current?.focus());
      }
    });
  }

  const errorList = Object.entries(errors);
  const cardError = (i: number, field: string) => errors[`cards.${i}.${field}`];

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {errorList.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-card-foreground"
        >
          <WarningCircle size={22} className="shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-semibold">Chưa lưu được, vui lòng sửa {errorList.length} lỗi:</p>
            <ul className="mt-1 list-disc pl-5">
              {errorList.slice(0, 8).map(([path, msg]) => (
                <li key={path}>
                  {path.startsWith("cards.") && path.split(".").length > 2 ? `Thẻ ${Number(path.split(".")[1]) + 1}: ` : ""}
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <Field id="set-title" label="Tên học phần" required error={errors.title}>
          <input
            id="set-title"
            value={title}
            maxLength={LIMITS.title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={!!errors.title || undefined}
            aria-describedby={errors.title ? "set-title-error" : undefined}
            placeholder="Ví dụ: Động từ N5 – bài 1"
            className="field-input"
          />
        </Field>
        <Field id="set-description" label="Mô tả" error={errors.description}>
          <textarea
            id="set-description"
            value={description}
            maxLength={LIMITS.description}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            className="field-input min-h-20 py-2"
          />
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-card-foreground">Ai được xem</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {VISIBILITIES.map((v) => (
              <label
                key={v}
                className={`flex cursor-pointer flex-col rounded-xl border p-3 text-sm transition-colors ${
                  visibility === v ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-card-foreground">
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={visibility === v}
                    onChange={() => setVisibility(v)}
                    className="accent-[var(--primary)]"
                  />
                  {VISIBILITY_LABELS[v].label}
                </span>
                <span className="mt-0.5 pl-6 text-xs text-muted-foreground">{VISIBILITY_LABELS[v].hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <details className="group rounded-2xl border border-border bg-card p-5">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-card-foreground">
          <UploadSimple size={20} aria-hidden />
          Nhập nhanh từ danh sách
        </summary>
        <div className="mt-3 space-y-2">
          <label htmlFor="import-text" className="text-sm text-muted-foreground">
            Mỗi dòng một thẻ: <code>từ⇥nghĩa</code>, <code>từ - nghĩa</code>, <code>từ: nghĩa</code> hoặc <code>từ⇥cách đọc⇥nghĩa</code>.
          </label>
          <textarea
            id="import-text"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            lang="ja"
            placeholder={"食べる - ăn\n飲む - uống"}
            className="field-input min-h-28 py-2"
          />
          {imported && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Đọc được {imported.cards.length} thẻ
              {imported.skipped.length > 0 && `; bỏ qua dòng ${imported.skipped.slice(0, 10).join(", ")} (không tách được)`}.
            </p>
          )}
          <button
            type="button"
            onClick={addImported}
            disabled={!imported?.cards.length}
            className="btn-secondary"
          >
            Thêm {imported?.cards.length ?? 0} thẻ
          </button>
        </div>
      </details>

      <section aria-labelledby="cards-heading" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="cards-heading" className="text-lg font-semibold text-card-foreground">
            Thẻ ({cards.length})
          </h2>
          <p className="text-xs text-muted-foreground">Gõ từ tiếng Nhật để chọn từ trong từ điển và tự điền.</p>
        </div>
        {errors.cards && <p className="text-sm text-destructive">{errors.cards}</p>}
        <ol className="space-y-3">
          {cards.map((c, i) => {
            const base = `card-${c.key}`;
            return (
              <li key={c.key} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">{i + 1}</span>
                  <div className="flex gap-1">
                    <button type="button" className="icon-btn" disabled={i === 0} onClick={() => moveCard(i, -1)} aria-label={`Chuyển thẻ ${i + 1} lên`}>
                      <ArrowUp size={18} aria-hidden />
                    </button>
                    <button type="button" className="icon-btn" disabled={i === cards.length - 1} onClick={() => moveCard(i, 1)} aria-label={`Chuyển thẻ ${i + 1} xuống`}>
                      <ArrowDown size={18} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="icon-btn hover:text-destructive"
                      onClick={() => setCards((list) => list.filter((x) => x.key !== c.key))}
                      aria-label={`Xóa thẻ ${i + 1}`}
                    >
                      <Trash size={18} aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.5fr]">
                  <Field id={`${base}-term`} label="Thuật ngữ" required error={cardError(i, "term")}>
                    <TermField
                      id={`${base}-term`}
                      value={c.term}
                      invalid={!!cardError(i, "term")}
                      describedBy={cardError(i, "term") ? `${base}-term-error` : undefined}
                      onChange={(term) => updateCard(c.key, { term, wordId: null })}
                      onPick={(w) =>
                        updateCard(c.key, {
                          term: w.headword,
                          reading: c.reading || (w.reading !== w.headword ? w.reading : ""),
                          definition: c.definition || w.preview.slice(0, LIMITS.definition),
                          wordId: w.id,
                        })
                      }
                    />
                  </Field>
                  <Field id={`${base}-reading`} label="Cách đọc" error={cardError(i, "reading")}>
                    <input
                      id={`${base}-reading`}
                      lang="ja"
                      value={c.reading}
                      maxLength={LIMITS.reading}
                      onChange={(e) => updateCard(c.key, { reading: e.target.value })}
                      className="field-input"
                    />
                  </Field>
                  <Field id={`${base}-definition`} label="Định nghĩa" required error={cardError(i, "definition")}>
                    <input
                      id={`${base}-definition`}
                      value={c.definition}
                      maxLength={LIMITS.definition}
                      onChange={(e) => updateCard(c.key, { definition: e.target.value })}
                      aria-invalid={!!cardError(i, "definition") || undefined}
                      aria-describedby={cardError(i, "definition") ? `${base}-definition-error` : undefined}
                      className="field-input"
                    />
                  </Field>
                </div>
                {c.wordId && <p className="mt-2 text-xs text-muted-foreground">Liên kết với từ điển</p>}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={() => setCards((list) => [...list, blankCard()])}
          disabled={cards.length >= LIMITS.maxCards}
          className="btn-secondary w-full justify-center"
        >
          <Plus size={18} aria-hidden />
          Thêm thẻ
        </button>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <CircleNotch size={18} className="animate-spin" aria-hidden />}
          {pending ? "Đang lưu…" : setId ? "Lưu thay đổi" : "Tạo học phần"}
        </button>
      </div>
    </form>
  );
}
