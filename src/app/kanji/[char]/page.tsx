import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import { StrokeOrder } from "@/components/StrokeOrder";
import { getKanji } from "@/lib/dictionary";
import { gradeLabel } from "@/lib/labels";

type Params = PageProps<"/kanji/[char]">["params"];

async function load(params: Params) {
  const char = decodeURIComponent((await params).char);
  if ([...char].length !== 1) notFound();
  const kanji = await getKanji(char);
  if (!kanji) notFound();
  return kanji;
}

export async function generateMetadata({ params }: PageProps<"/kanji/[char]">): Promise<Metadata> {
  const k = await load(params);
  return {
    title: `Kanji ${k.character} (${k.hanViet.join(", ")}) — bộ thủ, cách viết`,
    description: `${k.character}: âm Hán Việt ${k.hanViet.join(", ")}, On ${k.onReadings.join("、")}, Kun ${k.kunReadings.join("、")}. ${k.meaningsEn.join(", ")}.`,
  };
}

export default function KanjiPage({ params }: PageProps<"/kanji/[char]">) {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-card" />}>
      <KanjiDetail params={params} />
    </Suspense>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-card-foreground">{children}</dd>
    </div>
  );
}

async function KanjiDetail({ params }: { params: Params }) {
  const k = await load(params);
  const grade = gradeLabel(k.grade);

  return (
    <article className="space-y-8">
      <header className="grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-[auto_1fr_auto] md:p-8">
        <h1 lang="ja" className="font-jp-serif text-8xl leading-none text-card-foreground md:text-9xl">
          {k.character}
        </h1>
        <div className="space-y-4">
          <p className="text-3xl font-bold uppercase text-primary">{k.hanViet.join(", ") || "—"}</p>
          <p className="text-lg text-card-foreground">{k.meaningsVi.length ? k.meaningsVi.join(", ") : k.meaningsEn.join(", ")}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Fact label="Âm On">
              <span lang="ja">{k.onReadings.join("、") || "—"}</span>
            </Fact>
            <Fact label="Âm Kun">
              <span lang="ja">{k.kunReadings.join("、") || "—"}</span>
            </Fact>
            <Fact label="Số nét">{k.strokeCount}</Fact>
            {grade && <Fact label="Cấp độ">{grade}</Fact>}
            {k.jlptOld && <Fact label="JLPT (thang cũ)">Cấp {k.jlptOld}</Fact>}
            {k.frequency && <Fact label="Độ phổ biến">#{k.frequency} / 2500</Fact>}
          </dl>
        </div>
        <StrokeOrder paths={k.strokes} character={k.character} />
      </header>

      <section aria-labelledby="parts" className="space-y-4">
        <h2 id="parts" className="text-xl font-semibold text-card-foreground">
          Bộ thủ & thành phần
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-muted-foreground">Bộ thủ chính (Khang Hy)</h3>
            {k.radical ? (
              <p className="mt-2 flex items-center gap-4">
                <span lang="ja" className="font-jp-serif text-5xl">
                  {k.radical.display}
                </span>
                <span>
                  <span className="block font-semibold uppercase text-primary">
                    Bộ {k.radical.hanViet ?? ""} <span className="font-normal text-muted-foreground">(số {k.radical.kangxiNo})</span>
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {k.radical.strokeCount} nét · {k.radical.meaningEn}
                  </span>
                </span>
              </p>
            ) : (
              <p className="mt-2 text-muted-foreground">—</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-muted-foreground">Các thành phần cấu tạo</h3>
            {k.components.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {k.components.map((c) => {
                  const inner = (
                    <>
                      <span lang="ja" className="font-jp-serif text-3xl">
                        {c.display}
                      </span>
                      <span className="text-xs">
                        <span className="block font-semibold uppercase text-primary">{c.hanViet ?? ""}</span>
                        <span className="block text-muted-foreground">{c.strokeCount} nét</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={c.id}>
                      {c.isKanji && c.display !== k.character ? (
                        <Link
                          href={`/kanji/${encodeURIComponent(c.display)}`}
                          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 transition-colors hover:border-primary hover:bg-muted"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2">
                          {inner}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-muted-foreground">Chữ này là một thành phần cơ bản.</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Nguồn phân rã: KRADFILE (EDRDG).</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
          <Sparkle size={20} className="mt-0.5 shrink-0 text-secondary" aria-hidden />
          <p>Mẹo nhớ do AI giải thích dựa trên các thành phần trên sẽ có ở bản tiếp theo.</p>
        </div>
      </section>

      {k.words.length > 0 && (
        <section aria-labelledby="words" className="space-y-4">
          <h2 id="words" className="text-xl font-semibold text-card-foreground">
            Từ thông dụng có chữ <span lang="ja">{k.character}</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {k.words.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/tu/${w.id}`}
                  className="block rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary"
                >
                  <span lang="ja" className="text-xl text-card-foreground">
                    {w.kanjiForms[0]?.text}
                  </span>{" "}
                  <span lang="ja" className="text-sm text-muted-foreground">
                    {w.readings[0]?.kana}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {w.senses[0]?.glossEn.slice(0, 3).join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
