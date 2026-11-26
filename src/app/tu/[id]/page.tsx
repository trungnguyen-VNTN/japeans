import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus, Quotes } from "@phosphor-icons/react/dist/ssr";
import { AiBadge } from "@/components/AiBadge";
import { CommonBadge } from "@/components/CommonBadge";
import { getWord } from "@/lib/dictionary";
import { miscLabel, posLabels } from "@/lib/labels";

type Params = PageProps<"/tu/[id]">["params"];

async function load(params: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const word = await getWord(id);
  if (!word) notFound();
  return word;
}

export async function generateMetadata({ params }: PageProps<"/tu/[id]">): Promise<Metadata> {
  const w = await load(params);
  const head = w.kanjiForms[0]?.text ?? w.readings[0]?.kana;
  return {
    title: `${head} (${w.readings[0]?.kana}) — nghĩa, cách dùng`,
    description: w.senses.slice(0, 3).map((s) => s.glossEn.join(", ")).join("; "),
  };
}

export default function WordPage({ params }: PageProps<"/tu/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-card" />}>
      <WordDetail params={params} />
    </Suspense>
  );
}

function Highlight({ text, form }: { text: string; form: string }) {
  const i = form ? text.indexOf(form) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-primary/15 px-0.5 text-inherit">{form}</mark>
      {text.slice(i + form.length)}
    </>
  );
}

async function WordDetail({ params }: { params: Params }) {
  const w = await load(params);
  const usuallyKana = w.senses[0]?.misc.includes("uk");
  const headword = (!usuallyKana && w.kanjiForms[0]?.text) || w.readings[0]?.kana;
  const reading = w.readings[0]?.kana;
  const otherForms = w.kanjiForms.map((k) => k.text).filter((t) => t !== headword);
  const otherReadings = w.readings.map((r) => r.kana).filter((k) => k !== reading && k !== headword);

  return (
    <article className="space-y-8">
      <header className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <h1 lang="ja" className="text-5xl font-medium text-card-foreground md:text-6xl">
            {headword}
          </h1>
          {reading !== headword && (
            <p lang="ja" className="pb-1 text-2xl text-muted-foreground">
              {reading}
            </p>
          )}
          {w.isCommon && (
            <div className="pb-2">
              <CommonBadge />
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Romaji: {w.readings[0]?.romaji}</p>
          <Link href={`/hoc-phan/them?tu=${w.id}`} className="btn-secondary">
            <Plus size={18} aria-hidden />
            Thêm vào học phần
          </Link>
        </div>

        {w.kanji.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Kanji trong từ">
            {w.kanji.map((k) => (
              <li key={k!.character}>
                <Link
                  href={`/kanji/${encodeURIComponent(k!.character)}`}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 transition-colors hover:border-primary hover:bg-muted"
                >
                  <span lang="ja" className="font-jp-serif text-3xl">
                    {k!.character}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold uppercase text-primary">
                      {k!.hanViet.slice(0, 2).join(", ") || "—"}
                    </span>
                    <span className="block text-xs text-muted-foreground">{k!.meaningsEn.slice(0, 2).join(", ")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      <section aria-labelledby="senses" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="senses" className="text-xl font-semibold text-card-foreground">
            Nghĩa
          </h2>
          {!w.senses.some((s) => s.glossVi.length) && (
            <p className="text-xs text-muted-foreground">Nghĩa tiếng Việt đang được biên soạn</p>
          )}
        </div>
        <ol className="space-y-4">
          {w.senses.map((s) => {
            const examples = w.examples.filter((e) => e.senseOrder === s.order);
            return (
              <li key={s.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                    {s.order + 1}
                  </span>
                  {posLabels(s.partsOfSpeech).map((p) => (
                    <span key={p} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {p}
                    </span>
                  ))}
                  {[...s.misc, ...s.fields].map((m) => (
                    <span key={m} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {miscLabel(m)}
                    </span>
                  ))}
                </div>
                {s.glossVi.length > 0 ? (
                  <>
                    <p className="mt-3 text-lg text-card-foreground">
                      {s.glossVi.join("; ")} {!s.viReviewed && <AiBadge />}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="sr-only">Nghĩa tiếng Anh: </span>
                      <span lang="en">{s.glossEn.join("; ")}</span>
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-lg text-card-foreground" lang="en">
                    {s.glossEn.join("; ")}
                  </p>
                )}
                {s.info.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{s.info.join("; ")}</p>}
                {(s.related.length > 0 || s.antonyms.length > 0) && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {s.related.length > 0 && (
                      <>
                        Xem thêm:{" "}
                        {s.related.map((r, i) => (
                          <span key={r}>
                            {i > 0 && ", "}
                            <Link lang="ja" href={`/tim-kiem?q=${encodeURIComponent(r.split("・")[0])}`} className="underline hover:text-primary">
                              {r}
                            </Link>
                          </span>
                        ))}
                      </>
                    )}
                    {s.antonyms.length > 0 && <> · Trái nghĩa: <span lang="ja">{s.antonyms.join(", ")}</span></>}
                  </p>
                )}
                {examples.length > 0 && (
                  <ul className="mt-4 space-y-3 border-t border-border pt-4">
                    {examples.map((e) => (
                      <li key={e.exampleId} className="flex gap-3">
                        <Quotes size={18} className="mt-1 shrink-0 text-secondary" aria-hidden />
                        <div>
                          <p lang="ja" className="text-lg text-card-foreground">
                            <Highlight text={e.example.textJa} form={e.form} />
                          </p>
                          <p className="text-sm text-muted-foreground">{e.example.textVi ?? e.example.textEn}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {(otherForms.length > 0 || otherReadings.length > 0) && (
        <section aria-labelledby="forms" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="forms" className="font-semibold text-card-foreground">
            Cách viết / cách đọc khác
          </h2>
          <p lang="ja" className="mt-2 text-lg">
            {[...otherForms, ...otherReadings].join("、")}
          </p>
        </section>
      )}
    </article>
  );
}
