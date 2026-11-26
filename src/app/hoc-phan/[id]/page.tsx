import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cards, Globe, LinkSimple, LockSimple, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { CloneButton, DeleteButton } from "@/components/study-sets/SetActions";
import { getCurrentUser } from "@/lib/auth";
import { getSetForViewer } from "@/lib/study-sets-db";
import { VISIBILITY_LABELS, type Visibility } from "@/lib/study-sets";

const ICONS = { PRIVATE: LockSimple, UNLISTED: LinkSimple, PUBLIC: Globe } as const;

export async function generateMetadata(): Promise<Metadata> {
  // Titles of private sets must not leak; keep metadata generic.
  return { title: "Học phần" };
}

export default function SetPage({ params }: PageProps<"/hoc-phan/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-card" />}>
      <SetView params={params} />
    </Suspense>
  );
}

async function SetView({ params }: { params: PageProps<"/hoc-phan/[id]">["params"] }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const set = await getSetForViewer(id, user?.id ?? null);
  if (!set) notFound();
  const v = set.visibility as Visibility;
  const Icon = ICONS[v];

  return (
    <article className="space-y-6">
      <header className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-card-foreground">{set.title}</h1>
          {set.description && <p className="text-muted-foreground">{set.description}</p>}
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Cards size={16} aria-hidden />
            {set.cards.length} thẻ
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon size={16} aria-hidden />
            {VISIBILITY_LABELS[v].label}
          </span>
          {set.owner.name && <span>Tạo bởi {set.owner.name}</span>}
          {set.cloneOf && set.cloneOf.visibility !== "PRIVATE" && (
            <span>
              Sao chép từ{" "}
              <Link href={`/hoc-phan/${set.cloneOf.id}`} className="underline hover:text-primary">
                {set.cloneOf.title}
              </Link>
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-muted px-5 text-sm font-medium text-muted-foreground"
            title="Các chế độ học sẽ có trong bản cập nhật tới"
          >
            Học (sắp có)
          </span>
          {set.editable ? (
            <>
              <Link href={`/hoc-phan/${set.id}/sua`} className="btn-secondary">
                <PencilSimple size={18} aria-hidden />
                Sửa
              </Link>
              <div className="ml-auto">
                <DeleteButton setId={set.id} title={set.title} />
              </div>
            </>
          ) : user ? (
            <CloneButton setId={set.id} />
          ) : null}
        </div>
      </header>

      <section aria-labelledby="card-list" className="space-y-3">
        <h2 id="card-list" className="text-lg font-semibold text-card-foreground">
          Danh sách thẻ
        </h2>
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {set.cards.map((c, i) => (
            <li key={c.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[2rem_1fr_1.5fr] sm:items-baseline sm:gap-4">
              <span className="hidden text-sm text-muted-foreground sm:block">{i + 1}</span>
              <span>
                {c.wordId ? (
                  <Link href={`/tu/${c.wordId}`} lang="ja" className="text-lg text-card-foreground hover:text-primary">
                    {c.term}
                  </Link>
                ) : (
                  <span lang="ja" className="text-lg text-card-foreground">
                    {c.term}
                  </span>
                )}
                {c.reading && (
                  <span lang="ja" className="ml-2 text-sm text-muted-foreground">
                    {c.reading}
                  </span>
                )}
              </span>
              <span className="text-card-foreground">{c.definition}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
