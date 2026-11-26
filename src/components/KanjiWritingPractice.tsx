"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, ArrowUUpLeft, CheckCircle, Lightbulb, SkipForward } from "@phosphor-icons/react";
import { BOX, checkStroke, simplify, VERDICT_MESSAGES, type Point, type Stroke } from "@/lib/handwriting";

type Mode = "check" | "free";

const btn =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

const toPath = (pts: Stroke) => (pts.length ? `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")}` : "");

/**
 * Write a kanji on screen. "check" mode compares every stroke with KanjiVG (order, direction, position);
 * "free" mode is a plain practice pad. Works with mouse, touch and pen (Pointer Events).
 */
export function KanjiWritingPractice({ character, strokes }: { character: string; strokes: string[] }) {
  const canCheck = strokes.length > 0;
  const svgRef = useRef<SVGSVGElement>(null);
  const ghostRefs = useRef<(SVGPathElement | null)[]>([]);
  const [expected, setExpected] = useState<Stroke[]>([]);
  const [mode, setMode] = useState<Mode>(canCheck ? "check" : "free");
  const [showGhost, setShowGhost] = useState(true);
  const [done, setDone] = useState(0); // strokes accepted in check mode
  const [freeStrokes, setFreeStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0); // consecutive mistakes on the current stroke
  const [hint, setHint] = useState(false);
  const [message, setMessage] = useState("");
  const drawing = useRef<Stroke | null>(null);

  // Sample KanjiVG paths once they are in the DOM (getPointAtLength needs a rendered path).
  useEffect(() => {
    const sampled = ghostRefs.current.map((el) => {
      if (!el) return [];
      const len = el.getTotalLength();
      const n = Math.max(8, Math.ceil(len / 3));
      return Array.from({ length: n + 1 }, (_, i) => {
        const p = el.getPointAtLength((len * i) / n);
        return { x: p.x, y: p.y };
      });
    });
    setExpected(sampled);
  }, [strokes]);

  const finished = mode === "check" && canCheck && done >= strokes.length;

  function reset(nextMode: Mode = mode) {
    setMode(nextMode);
    setDone(0);
    setFreeStrokes([]);
    setMistakes(0);
    setStreak(0);
    setHint(false);
    setCurrent(null);
    setMessage(nextMode === "check" ? `Viết nét 1 trên ${strokes.length}.` : "Viết tự do. Không chấm nét.");
  }

  function toPoint(e: React.PointerEvent<SVGSVGElement>): Point | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: Math.min(BOX, Math.max(0, p.x)), y: Math.min(BOX, Math.max(0, p.y)) };
  }

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    if (finished || (e.pointerType === "mouse" && e.button !== 0)) return;
    const p = toPoint(e);
    if (!p) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keep receiving moves when the pen leaves the box
    } catch {
      // some pointers (e.g. synthetic ones) cannot be captured; drawing still works inside the box
    }
    drawing.current = [p];
    setCurrent([p]);
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawing.current) return;
    const p = toPoint(e);
    if (!p) return;
    drawing.current.push(p);
    setCurrent([...drawing.current]);
  }

  function onUp() {
    const stroke = drawing.current ? simplify(drawing.current) : null;
    drawing.current = null;
    setCurrent(null);
    if (!stroke) return;

    if (mode === "free") {
      setFreeStrokes((s) => [...s, stroke]);
      return;
    }
    const verdict = checkStroke(stroke, expected, done);
    if (verdict.ok) {
      const next = done + 1;
      setDone(next);
      setStreak(0);
      setHint(false);
      setMessage(
        next >= strokes.length
          ? `Hoàn thành chữ ${character}! ${mistakes === 0 ? "Không sai nét nào." : `Sai ${mistakes} lần.`}`
          : `Đúng. Viết nét ${next + 1} trên ${strokes.length}.`,
      );
    } else {
      if (verdict.reason === "too-short") {
        setMessage(VERDICT_MESSAGES[verdict.reason]);
        return;
      }
      setMistakes((m) => m + 1);
      setStreak((s) => s + 1);
      // After two misses on the same stroke, show where it goes.
      if (streak + 1 >= 2) setHint(true);
      setMessage(VERDICT_MESSAGES[verdict.reason]);
    }
  }

  function skipStroke() {
    if (finished) return;
    setMistakes((m) => m + 1);
    setStreak(0);
    setHint(false);
    const next = done + 1;
    setDone(next);
    setMessage(next >= strokes.length ? `Hết nét. Sai ${mistakes + 1} lần.` : `Đã bỏ qua. Viết nét ${next + 1} trên ${strokes.length}.`);
  }

  const total = strokes.length;
  const progress = mode === "check" && canCheck ? Math.min(done, total) : freeStrokes.length;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="mx-auto w-full max-w-80 shrink-0">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOX} ${BOX}`}
          role="img"
          aria-label={`Ô luyện viết chữ ${character}. Dùng chuột, ngón tay hoặc bút để viết.`}
          className={`aspect-square w-full rounded-2xl border-2 bg-card ${finished ? "border-accent" : "border-border"} ${
            finished ? "cursor-default" : "cursor-crosshair"
          }`}
          style={{ touchAction: "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {/* 田 guide */}
          <path d={`M${BOX / 2} 0V${BOX}M0 ${BOX / 2}H${BOX}`} stroke="var(--border)" strokeDasharray="3 3" strokeWidth={0.6} />
          <path d={`M0 0L${BOX} ${BOX}M${BOX} 0L0 ${BOX}`} stroke="var(--border)" strokeDasharray="2 4" strokeWidth={0.4} opacity={0.6} />

          {/* model character: KanjiVG strokes, or the font glyph when there is no stroke data */}
          {canCheck ? (
            <g opacity={showGhost ? 1 : 0}>
              {strokes.map((d, i) => (
                <path
                  key={i}
                  ref={(el) => {
                    ghostRefs.current[i] = el;
                  }}
                  d={d}
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>
          ) : (
            showGhost && (
              <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontSize={88} fill="var(--muted)" lang="ja" className="font-jp-serif">
                {character}
              </text>
            )
          )}

          {/* accepted strokes are redrawn cleanly from the model */}
          {mode === "check" &&
            strokes.slice(0, done).map((d, i) => (
              <path key={`ok-${i}`} d={d} fill="none" stroke="var(--card-foreground)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
            ))}

          {/* hint for the next stroke: drawn in the primary colour, start marked with a dot */}
          {mode === "check" && hint && !finished && strokes[done] && (
            <g>
              <path d={strokes[done]} fill="none" stroke="var(--primary)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" className="hint-stroke" pathLength={1} />
              {expected[done]?.[0] && <circle cx={expected[done][0].x} cy={expected[done][0].y} r={3.5} fill="var(--primary)" />}
            </g>
          )}

          {mode === "free" &&
            freeStrokes.map((s, i) => (
              <path key={`free-${i}`} d={toPath(s)} fill="none" stroke="var(--card-foreground)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
            ))}

          {current && (
            <path d={toPath(current)} fill="none" stroke="var(--primary)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        <style>{`
          .hint-stroke { stroke-dasharray: 1; stroke-dashoffset: 1; animation: hint-draw 700ms ease-in-out forwards; }
          @keyframes hint-draw { to { stroke-dashoffset: 0; } }
          @media (prefers-reduced-motion: reduce) { .hint-stroke { animation: none; stroke-dashoffset: 0; } }
        `}</style>
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        {canCheck && (
          <div role="radiogroup" aria-label="Chế độ luyện viết" className="inline-flex rounded-xl border border-border bg-card p-1">
            {(
              [
                ["check", "Chấm từng nét"],
                ["free", "Viết tự do"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => reset(m)}
                className={`min-h-10 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors ${
                  mode === m ? "bg-primary text-on-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground">
            {mode === "check" && canCheck ? `Nét ${Math.min(done + (finished ? 0 : 1), total)} / ${total}` : `${progress} nét đã viết`}
            {mode === "check" && mistakes > 0 && ` · sai ${mistakes} lần`}
          </p>
          {mode === "check" && canCheck && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(progress / total) * 100}%` }} />
            </div>
          )}
        </div>

        <p role="status" aria-live="polite" className={`min-h-12 text-sm ${finished ? "font-semibold text-accent-strong" : "text-card-foreground"}`}>
          {finished && <CheckCircle size={18} weight="fill" className="mr-1 inline align-text-bottom" aria-hidden />}
          {message || (mode === "check" && canCheck ? `Viết theo thứ tự nét, bắt đầu từ nét 1 trên ${total}.` : "Viết chữ vào ô bên cạnh.")}
        </p>

        <div className="flex flex-wrap gap-2">
          {mode === "check" && canCheck ? (
            <>
              <button type="button" className={btn} disabled={finished} onClick={() => setHint(true)}>
                <Lightbulb size={18} aria-hidden />
                Gợi ý
              </button>
              <button type="button" className={btn} disabled={finished} onClick={skipStroke}>
                <SkipForward size={18} aria-hidden />
                Bỏ qua nét
              </button>
            </>
          ) : (
            <button type="button" className={btn} disabled={!freeStrokes.length} onClick={() => setFreeStrokes((s) => s.slice(0, -1))}>
              <ArrowUUpLeft size={18} aria-hidden />
              Hoàn tác
            </button>
          )}
          <button type="button" className={btn} onClick={() => reset()}>
            <ArrowCounterClockwise size={18} aria-hidden />
            Viết lại
          </button>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-card-foreground">
          <input type="checkbox" checked={showGhost} onChange={(e) => setShowGhost(e.target.checked)} className="size-4 accent-[var(--primary)]" />
          Hiện chữ mẫu mờ
        </label>
      </div>
    </div>
  );
}
