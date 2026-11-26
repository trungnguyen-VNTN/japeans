import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { AddWordButton } from "@/components/study-sets/AddWordButton";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardFromWord } from "@/lib/study-sets-db";

export const metadata: Metadata = { title: "Thêm vào học phần", robots: { index: false } };

export default function AddToSetPage({ searchParams }: PageProps<"/hoc-phan/them">) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold text-card-foreground">Thêm vào học phần</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-card" />}>
        <AddToSet searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AddToSet({ searchParams }: { searchParams: PageProps<"/hoc-phan/them">["searchParams"] }) {
  const wordId = Number((await searchParams).tu);
  if (!Number.isInteger(wordId) || wordId <= 0) notFound();
  const user = await requireUser(`/hoc-phan/them?tu=${wordId}`);
  const card = await cardFromWord(wordId);
  if (!card) notFound();

  const sets = await db.studySet.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      _count: { select: { cards: true } },
      cards: { where: { wordId }, select: { id: true }, take: 1 },
    },
  });

  return (
    <>
      <section aria-label="Từ sẽ thêm" className="rounded-2xl border border-border bg-card p-5">
        <p>
          <Link href={`/tu/${wordId}`} lang="ja" className="text-2xl text-card-foreground hover:text-primary">
            {card.term}
          </Link>
          {card.reading && (
            <span lang="ja" className="ml-2 text-muted-foreground">
              {card.reading}
            </span>
          )}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{card.definition}</p>
      </section>

      <section aria-labelledby="choose" className="space-y-3">
        <h2 id="choose" className="text-lg font-semibold text-card-foreground">
          Chọn học phần
        </h2>
        {sets.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {sets.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <Link href={`/hoc-phan/${s.id}`} className="font-medium text-card-foreground hover:text-primary">
                    {s.title}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{s._count.cards} thẻ</span>
                </span>
                <AddWordButton setId={s.id} wordId={wordId} alreadyIn={s.cards.length > 0} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Bạn chưa có học phần nào.</p>
        )}
        <Link href={`/hoc-phan/moi?tu=${wordId}`} className="btn-primary">
          <Plus size={18} aria-hidden />
          Tạo học phần mới với từ này
        </Link>
      </section>
    </>
  );
}
