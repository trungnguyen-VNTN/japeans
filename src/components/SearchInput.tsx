"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { moveActive, SUGGEST_DEBOUNCE_MS, suggestQuery } from "@/lib/autocomplete";

type Suggestion = { id: number; headword: string; reading: string; hanViet: string | null; preview: string };

type Props = { defaultValue?: string; large?: boolean; autoFocus?: boolean };

/**
 * Search input with word suggestions (ARIA combobox + listbox).
 * Enter without an active option submits the surrounding GET form as before.
 */
export function SearchInput({ defaultValue, large, autoFocus }: Props) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [result, setResult] = useState<{ q: string; items: Suggestion[] }>({ q: "", items: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Only suggest after the user edits: a prefilled query (results page) should not pop a list.
  const [touched, setTouched] = useState(false);

  const query = touched ? suggestQuery(value) : null;

  useEffect(() => {
    if (!query) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/goi-y?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { items: Suggestion[] };
        setResult({ q: query, items: data.items });
        setActive(-1);
      } catch {
        // aborted or offline: keep the previous suggestions
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const items = query ? result.items : [];
  const expanded = open && items.length > 0;

  function choose(item: Suggestion) {
    setOpen(false);
    router.push(`/tu/${item.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter / arrows while an IME (Japanese input) is composing belong to the IME.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!items.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((a) => moveActive(expanded ? a : -1, e.key === "ArrowDown" ? 1 : -1, items.length));
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <>
      <input
        id="q"
        name="q"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby="q-help"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setTouched(true);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        placeholder="勉強, べんきょう, benkyou, học sinh, study…"
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70 ${
          large ? "h-12 text-lg" : "h-10 text-base"
        }`}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {expanded ? `${items.length} gợi ý. Dùng phím mũi tên để chọn.` : ""}
      </p>
      <ul
        id={listId}
        role="listbox"
        aria-label="Gợi ý"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg"
      >
        {items.map((item, i) => (
          <li
            key={item.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown keeps focus in the input so blur does not close the list before click
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(item)}
            onMouseEnter={() => setActive(i)}
            className={`flex cursor-pointer flex-wrap items-baseline gap-x-2 px-4 py-2.5 ${i === active ? "bg-muted" : ""}`}
          >
            <span lang="ja" className="text-lg text-card-foreground">
              {item.headword}
            </span>
            {item.reading !== item.headword && (
              <span lang="ja" className="text-sm text-muted-foreground">
                {item.reading}
              </span>
            )}
            {item.hanViet && <span className="text-xs font-semibold uppercase text-primary">{item.hanViet}</span>}
            <span className="w-full truncate text-sm text-muted-foreground">{item.preview}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
