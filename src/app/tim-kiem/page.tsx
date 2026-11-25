import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MagnifyingGlassMinus } from "@phosphor-icons/react/dist/ssr";
import { AiBadge } from "@/components/AiBadge";
import { CommonBadge } from "@/components/CommonBadge";
import { SearchBox } from "@/components/SearchBox";
import { searchDictionary } from "@/lib/dictionary";
import { posLabels } from "@/lib/labels";

export async function generateMetadata({ searchParams }: PageProps<"/tim-kiem">): Promise<Metadata> {
  const q = String((await searchParams).q ?? "").trim();
  return { title: q ? `Tra “${q}”` : "Tra từ" };
}

export default function SearchPage({ searchParams }: PageProps<"/tim-kiem">) {
  return (
    <div className="space-y-8">
      <Suspense fallback={<SearchBox />}>
        <SearchHeader searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function getQuery(searchParams: PageProps<"/tim-kiem">["searchParams"]) {
  const q = (await searchParams).q;
  return String(Array.isArray(q) ? q[0] : (q ?? "")).trim();
}

async function SearchHeader({ searchParams }: { searchParams: PageProps<"/tim-kiem">["searchParams"] }) {
  return <SearchBox defaultValue={await getQuery(searchParams)} />;
}

async function Results({ searchParams }: { searchParams: PageProps<"/tim-kiem">["searchParams"] }) {
  const q = await getQuery(searchParams);
  if (!q) return <EmptyState query="" />;

  const { words, kanji, total } = await searchDictionary(q);
  if (!words.length && !kanji.length) return <EmptyState query={q} />;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_16rem]">
      <section aria-labelledby="word-results" className="min-w-0 space-y-3">
        <h1 id="word-results" className="text-lg font-semibold text-card-foreground">
          Từ vựng cho “{q}”{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({total >= 1000 ? "1000+" : total} kết quả{total > words.length ? `, hiển thị ${words.length}` : ""})
          </span>
        </h1>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {words.map((w) => (
            <li key={w.id}>
              <Link href={`/tu/${w.id}`} className="block px-4 py-3 transition-colors hover:bg-muted md:px-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span lang="ja" className="text-2xl font-medium text-card-foreground">
                    {w.headword}
                  </span>
                  {w.reading !== w.headword && (
                    <span lang="ja" className="text-muted-foreground">
                      {w.reading}
                    </span>
                  )}
                  {w.hanViet[0] && (
                    <span className="text-sm font-semibold uppercase tracking-wide text-primary">{w.hanViet[0]}</span>
                  )}
                  {w.isCommon && <CommonBadge />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="text-xs">{posLabels(w.pos).slice(0, 2).join(" · ")}</span>
                  {w.pos.length > 0 && " — "}
                  {w.preview} {w.aiPreview && <AiBadge label="AI" />}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {kanji.length > 0 && (
        <aside aria-labelledby="kanji-results" className="space-y-3">
          <h2 id="kanji-results" className="text-lg font-semibold text-card-foreground">
            Kanji
          </h2>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {kanji.map((k) => (
              <li key={k.character}>
                <Link
                  href={`/kanji/${encodeURIComponent(k.character)}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary"
                >
                  <span lang="ja" className="font-jp-serif text-4xl text-card-foreground">
                    {k.character}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold uppercase text-primary">
                      {k.hanViet.slice(0, 2).join(", ") || "—"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {k.meaningsEn.slice(0, 2).join(", ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <MagnifyingGlassMinus size={40} className="mx-auto text-muted-foreground" aria-hidden />
      <h1 className="mt-3 font-semibold text-card-foreground">
        {query ? `Không tìm thấy kết quả cho “${query}”` : "Nhập từ cần tra ở ô phía trên"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Thử gõ bằng kana (たべる), romaji (taberu), Hán Việt (thực) hoặc tiếng Anh (eat).
      </p>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tìm">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
      ))}
    </div>
  );
}
