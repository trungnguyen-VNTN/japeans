"use client";

import { useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";

const STROKE_MS = 450;

/** KanjiVG stroke paths (109×109 viewBox) drawn one by one. */
export function StrokeOrder({ paths, character }: { paths: string[]; character: string }) {
  const [run, setRun] = useState(0);

  if (!paths.length) {
    return <p className="text-sm text-muted-foreground">Chưa có dữ liệu thứ tự nét cho chữ này.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        key={run}
        viewBox="0 0 109 109"
        role="img"
        aria-label={`Thứ tự nét viết chữ ${character}, ${paths.length} nét`}
        className="size-48 rounded-xl border border-border bg-card md:size-56"
      >
        {/* guide lines */}
        <path d="M54.5 0V109M0 54.5H109" stroke="var(--border)" strokeDasharray="3 3" strokeWidth={0.6} />
        {paths.map((d, i) => (
          <path key={`ghost-${i}`} d={d} fill="none" stroke="var(--muted)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength={1}
            fill="none"
            stroke="var(--card-foreground)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-draw"
            style={{ animationDelay: `${i * STROKE_MS}ms`, animationDuration: `${STROKE_MS}ms` }}
          />
        ))}
      </svg>
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
      >
        <ArrowCounterClockwise size={18} aria-hidden />
        Viết lại
      </button>
      <style>{`
        .stroke-draw { stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; animation-name: draw; animation-timing-function: ease-in-out; animation-fill-mode: forwards; }
        @keyframes draw { from { opacity: 1; stroke-dashoffset: 1; } to { opacity: 1; stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .stroke-draw { animation: none; stroke-dashoffset: 0; opacity: 1; } }
      `}</style>
    </div>
  );
}
