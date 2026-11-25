import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RadicalPicker } from "@/components/RadicalPicker";
import { findKanjiByRadicals, getPickerRadicals } from "@/lib/dictionary";
import { groupByStrokes, parseRadicalIds } from "@/lib/radicals";

export const metadata: Metadata = {
  title: "Tra kanji theo bộ thủ",
  description: "Chọn các bộ thủ, thành phần bạn nhìn thấy trong chữ để tìm ra kanji, kể cả khi không biết cách đọc.",
};

type SearchParams = PageProps<"/kanji/bo-thu">["searchParams"];

export default function RadicalSearchPage({ searchParams }: PageProps<"/kanji/bo-thu">) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-card-foreground">Tra kanji theo bộ thủ</h1>
        <p className="text-muted-foreground">
          Không biết cách đọc? Chọn các thành phần bạn nhìn thấy trong chữ (ví dụ <span lang="ja">女</span> +{" "}
          <span lang="ja">子</span> → <span lang="ja">好</span>). Bộ mờ là bộ không còn kết hợp được với lựa chọn hiện tại.
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-card" />}>
        <RadicalSearch searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RadicalSearch({ searchParams }: { searchParams: SearchParams }) {
  const selected = parseRadicalIds((await searchParams).bo);
  const [radicals, result] = await Promise.all([getPickerRadicals(), findKanjiByRadicals(selected)]);
  const shown = result.kanji.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="picker" className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <h2 id="picker" className="sr-only">
          Chọn bộ thủ
        </h2>
        <RadicalPicker radicals={radicals} selected={selected} available={result.available} total={result.total} />
      </section>

      {/* On small screens results go first so a selection's effect is visible without scrolling. */}
      <section aria-labelledby="matches" className="order-first space-y-3 lg:sticky lg:top-20 lg:order-none lg:self-start">
        <h2 id="matches" className="text-lg font-semibold text-card-foreground">
          Kanji phù hợp{" "}
          {selected.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({result.total}
              {result.total > shown ? `, hiển thị ${shown}` : ""})
            </span>
          )}
        </h2>
        {selected.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            Kết quả sẽ hiện ở đây sau khi bạn chọn bộ thủ.
          </p>
        ) : shown === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            Không có kanji nào chứa tất cả các bộ đã chọn. Bỏ bớt một bộ để thử lại.
          </p>
        ) : (
          <div className="max-h-[35vh] space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 lg:max-h-[70vh]">
            {groupByStrokes(result.kanji).map(([strokes, list]) => (
              <div key={strokes}>
                <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">{strokes} nét</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {list.map((k) => (
                    <li key={k.character}>
                      <Link
                        href={`/kanji/${encodeURIComponent(k.character)}`}
                        lang="ja"
                        title={k.hanViet.join(", ") || undefined}
                        className="flex size-12 items-center justify-center rounded-lg border border-border font-jp-serif text-2xl text-card-foreground transition-colors hover:border-primary hover:bg-muted"
                      >
                        {k.character}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
