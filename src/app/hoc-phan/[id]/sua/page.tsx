import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SetEditor } from "@/components/study-sets/SetEditor";
import { requireUser } from "@/lib/auth";
import { getSetForViewer } from "@/lib/study-sets-db";
import type { Visibility } from "@/lib/study-sets";

export const metadata: Metadata = { title: "Sửa học phần", robots: { index: false } };

export default function EditSetPage({ params }: PageProps<"/hoc-phan/[id]/sua">) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold text-card-foreground">Sửa học phần</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-card" />}>
        <EditForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditForm({ params }: { params: PageProps<"/hoc-phan/[id]/sua">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/hoc-phan/${id}/sua`);
  const set = await getSetForViewer(id, user.id);
  if (!set || !set.editable) notFound();
  return (
    <SetEditor
      setId={set.id}
      initial={{
        title: set.title,
        description: set.description ?? "",
        visibility: set.visibility as Visibility,
        tags: set.tags,
        cards: set.cards.map((c) => ({
          id: c.id,
          term: c.term,
          reading: c.reading ?? "",
          definition: c.definition,
          wordId: c.wordId,
        })),
      }}
    />
  );
}
