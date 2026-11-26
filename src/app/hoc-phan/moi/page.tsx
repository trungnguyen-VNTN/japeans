import type { Metadata } from "next";
import { Suspense } from "react";
import { SetEditor } from "@/components/study-sets/SetEditor";
import { requireUser } from "@/lib/auth";
import { cardFromWord } from "@/lib/study-sets-db";

export const metadata: Metadata = { title: "Tạo học phần", robots: { index: false } };

export default function NewSetPage({ searchParams }: PageProps<"/hoc-phan/moi">) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold text-card-foreground">Tạo học phần</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-card" />}>
        <NewSetForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewSetForm({ searchParams }: { searchParams: PageProps<"/hoc-phan/moi">["searchParams"] }) {
  const params = await searchParams;
  const wordId = Number(params.tu);
  await requireUser(Number.isInteger(wordId) && wordId > 0 ? `/hoc-phan/moi?tu=${wordId}` : "/hoc-phan/moi");
  // "Create a set with this word" from a dictionary page starts with that word as card 1.
  const first = Number.isInteger(wordId) && wordId > 0 ? await cardFromWord(wordId) : null;
  return (
    <SetEditor
      setId={null}
      initial={{ title: "", description: "", visibility: "PRIVATE", tags: [], cards: first ? [first] : [] }}
    />
  );
}
