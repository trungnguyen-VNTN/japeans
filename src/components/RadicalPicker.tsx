"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { groupByStrokes, MAX_SELECTED_RADICALS, toggleId } from "@/lib/radicals";
import type { RadicalItem } from "@/lib/dictionary";

type Props = {
  radicals: RadicalItem[];
  selected: number[];
  /** Components still combinable with the selection; null = nothing selected (all enabled). */
  available: number[] | null;
  total: number;
};

export function RadicalPicker({ radicals, selected, available, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const availableSet = available ? new Set(available) : null;
  const full = selected.length >= MAX_SELECTED_RADICALS;

  function go(ids: number[]) {
    startTransition(() => {
      router.replace(ids.length ? `${pathname}?bo=${ids.join(",")}` : pathname, { scroll: false });
    });
  }

  const status = pending
    ? "Đang lọc…"
    : selected.length === 0
      ? "Chọn một hoặc nhiều bộ thủ để lọc kanji."
      : `${total} kanji chứa ${selected.length === 1 ? "bộ đã chọn" : `cả ${selected.length} bộ đã chọn`}.`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {status}
        </p>
        <button
          type="button"
          onClick={() => go([])}
          disabled={!selected.length}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowCounterClockwise size={18} aria-hidden />
          Bỏ chọn
        </button>
      </div>

      <div className={`space-y-2 transition-opacity ${pending ? "opacity-70" : ""}`}>
        {groupByStrokes(radicals).map(([strokes, list]) => (
          <div key={strokes} role="group" aria-label={`${strokes} nét`} className="flex flex-wrap items-center gap-1.5">
            <span className="w-7 shrink-0 text-center text-xs font-semibold text-muted-foreground" aria-hidden>
              {strokes}
            </span>
            {list.map((r) => {
              const isOn = selected.includes(r.id);
              const disabled = !isOn && (full || (availableSet !== null && !availableSet.has(r.id)));
              return (
                <button
                  key={r.id}
                  type="button"
                  lang="ja"
                  aria-pressed={isOn}
                  aria-label={`${r.display}${r.hanViet ? ` (${r.hanViet})` : ""}`}
                  title={r.hanViet ?? undefined}
                  disabled={disabled}
                  onClick={() => go(toggleId(selected, r.id))}
                  className={`flex size-11 cursor-pointer items-center justify-center rounded-lg border text-xl transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                    isOn
                      ? "border-primary bg-primary text-on-primary"
                      : "border-border bg-card text-card-foreground hover:border-primary"
                  }`}
                >
                  {r.display}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
