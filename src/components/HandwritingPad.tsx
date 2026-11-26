"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUUpLeft, CircleNotch, Eraser, X } from "@phosphor-icons/react";

type Candidate = { character: string; hanViet: string | null; meaning: string };
type Pt = [number, number];

const SIZE = 300; // drawing coordinates (the server normalises, so only proportions matter)
const btn =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

const toPath = (pts: Pt[]) => (pts.length ? `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")}` : "");

/**
 * Draw a kanji; after every stroke the server returns the most similar characters.
 * Picking one hands it to `onPick` (e.g. appended to the search box) and clears the pad for the next one.
 */
export function HandwritingPad({ id, onPick, onClose }: { id: string; onPick: (ch: string) => void; onClose: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef<Pt[] | null>(null);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [current, setCurrent] = useState<Pt[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Recognise after each stroke (and after undo); cancel stale requests.
  useEffect(() => {
    if (!strokes.length) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/nhan-dang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strokes }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        setCandidates(((await res.json()) as { items: Candidate[] }).items);
        setError(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 120);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [strokes]);

  function point(e: React.PointerEvent<SVGSVGElement>): Pt | null {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return [Math.min(SIZE, Math.max(0, p.x)), Math.min(SIZE, Math.max(0, p.y))];
  }

  function clear() {
    setStrokes([]);
    setCandidates([]);
    setError(false);
  }

  const shown = strokes.length ? candidates : [];

  return (
    <div
      id={id}
      role="dialog"
      aria-label="Viết tay để tìm kanji"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-border bg-card p-3 shadow-lg"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Ô viết tay. Viết một chữ kanji bằng chuột, ngón tay hoặc bút."
          className="mx-auto aspect-square w-full max-w-72 shrink-0 cursor-crosshair rounded-xl border border-border bg-background"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            const p = point(e);
            if (!p) return;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // not capturable: still fine inside the box
            }
            drawing.current = [p];
            setCurrent([p]);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const p = point(e);
            if (!p) return;
            const last = drawing.current[drawing.current.length - 1];
            if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 2) return;
            drawing.current.push(p);
            setCurrent([...drawing.current]);
          }}
          onPointerUp={() => {
            const s = drawing.current;
            drawing.current = null;
            setCurrent(null);
            if (s && s.length) setStrokes((list) => [...list, s]);
          }}
          onPointerCancel={() => {
            drawing.current = null;
            setCurrent(null);
          }}
        >
          <path d={`M${SIZE / 2} 0V${SIZE}M0 ${SIZE / 2}H${SIZE}`} stroke="var(--border)" strokeDasharray="6 6" strokeWidth={1} />
          {[...strokes, ...(current ? [current] : [])].map((s, i) => (
            <path
              key={i}
              d={toPath(s)}
              fill="none"
              stroke={i === strokes.length ? "var(--primary)" : "var(--card-foreground)"}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {!strokes.length && !current && (
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={20} fill="var(--muted-foreground)">
              Viết chữ vào đây
            </text>
          )}
        </svg>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-card-foreground" aria-live="polite">
              {loading ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <CircleNotch size={16} className="animate-spin" aria-hidden />
                  Đang nhận diện…
                </span>
              ) : error ? (
                <span className="text-destructive">Không nhận diện được, thử lại.</span>
              ) : shown.length ? (
                `${shown.length} chữ gần giống, chọn để chèn vào ô tìm`
              ) : (
                "Chọn chữ gần giống sau khi viết"
              )}
            </p>
            <button type="button" onClick={onClose} aria-label="Đóng bảng viết tay" className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
              <X size={20} aria-hidden />
            </button>
          </div>

          <ul className="grid grid-cols-5 gap-2" aria-label="Chữ gần giống">
            {shown.map((c) => (
              <li key={c.character}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(c.character);
                    clear();
                  }}
                  title={[c.hanViet, c.meaning].filter(Boolean).join(" · ")}
                  aria-label={`${c.character}${c.hanViet ? `, ${c.hanViet}` : ""}`}
                  className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-border bg-background transition-colors hover:border-primary hover:bg-muted"
                >
                  <span lang="ja" className="font-jp-serif text-2xl leading-none text-card-foreground">
                    {c.character}
                  </span>
                  {c.hanViet && <span className="mt-1 max-w-full truncate px-0.5 text-[10px] font-semibold uppercase text-primary">{c.hanViet}</span>}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={!strokes.length} onClick={() => setStrokes((s) => s.slice(0, -1))}>
              <ArrowUUpLeft size={18} aria-hidden />
              Hoàn tác
            </button>
            <button type="button" className={btn} disabled={!strokes.length} onClick={clear}>
              <Eraser size={18} aria-hidden />
              Xóa
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Nhận diện trên máy chủ Japeans; nét vẽ không được lưu.</p>
        </div>
      </div>
    </div>
  );
}
