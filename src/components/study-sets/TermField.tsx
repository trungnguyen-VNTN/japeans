"use client";

import { useEffect, useId, useState } from "react";
import { moveActive, SUGGEST_DEBOUNCE_MS, suggestQuery } from "@/lib/autocomplete";

export type WordSuggestion = { id: number; headword: string; reading: string; hanViet: string | null; preview: string };

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (word: WordSuggestion) => void;
  invalid?: boolean;
  describedBy?: string;
};

/** Term input that suggests dictionary words (combobox); picking one fills the rest of the card. */
export function TermField({ id, value, onChange, onPick, invalid, describedBy }: Props) {
  const listId = useId();
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ q: string; items: WordSuggestion[] }>({ q: "", items: [] });
  const query = touched ? suggestQuery(value) : null;

  useEffect(() => {
    if (!query) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/goi-y?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) {
          setResult({ q: query, items: ((await res.json()) as { items: WordSuggestion[] }).items.slice(0, 6) });
          setActive(-1);
        }
      } catch {
        // aborted / offline
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const items = query ? result.items : [];
  const expanded = open && items.length > 0;

  function pick(word: WordSuggestion) {
    onPick(word);
    setOpen(false);
    setTouched(false);
  }

  return (
    <div className="relative">
      <input
        id={id}
        lang="ja"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTouched(true);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => moveActive(expanded ? a : -1, e.key === "ArrowDown" ? 1 : -1, items.length));
          } else if (e.key === "Enter" && expanded && active >= 0) {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape" && expanded) {
            e.preventDefault();
            setOpen(false);
          }
        }}
        className="field-input"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Từ trong từ điển"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg"
      >
        {items.map((w, i) => (
          <li
            key={w.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(w)}
            onMouseEnter={() => setActive(i)}
            className={`cursor-pointer px-3 py-2 ${i === active ? "bg-muted" : ""}`}
          >
            <span lang="ja" className="text-card-foreground">
              {w.headword}
            </span>{" "}
            {w.reading !== w.headword && (
              <span lang="ja" className="text-sm text-muted-foreground">
                {w.reading}
              </span>
            )}
            <span className="block truncate text-xs text-muted-foreground">{w.preview}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
