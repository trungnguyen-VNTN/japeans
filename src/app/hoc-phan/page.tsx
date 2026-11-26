import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cards, Plus } from "@phosphor-icons/react/dist/ssr";
import { SetListItem } from "@/components/study-sets/SetListItem";
import { getCurrentUser } from "@/lib/auth";
import { listMySets, listPublicSets } from "@/lib/study-sets-db";

export const metadata: Metadata = {
  title: "Học phần",
  description: "Tạo bộ thẻ từ vựng tiếng Nhật, tự điền từ từ điển, và khám phá học phần của người khác.",
};

const grid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

export default function StudySetsPage() {
  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-card-foreground">Học phần</h1>
          <p className="text-muted-foreground">Bộ thẻ từ vựng để ôn tập. Gõ từ tiếng Nhật là tự điền cách đọc và nghĩa.</p>
        </div>
        <Link href="/hoc-phan/moi" className="btn-primary">
          <Plus size={18} aria-hidden />
          Tạo học phần
        </Link>
      </header>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-card" />}>
        <MySets />
      </Suspense>

      <section aria-labelledby="explore" className="space-y-3">
        <h2 id="explore" className="text-xl font-semibold text-card-foreground">
          Khám phá
        </h2>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-card" />}>
          <PublicSets />
        </Suspense>
      </section>
    </div>
  );
}

async function MySets() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
        <Link href="/dang-nhap?callbackUrl=%2Fhoc-phan" className="font-medium text-primary underline">
          Đăng nhập
        </Link>{" "}
        để tạo và lưu học phần của riêng bạn.
      </p>
    );
  }
  const sets = await listMySets(user.id);
  return (
    <section aria-labelledby="mine" className="space-y-3">
      <h2 id="mine" className="text-xl font-semibold text-card-foreground">
        Của tôi
      </h2>
      {sets.length ? (
        <ul className={grid}>
          {sets.map((s) => (
            <li key={s.id}>
              <SetListItem set={s} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Cards size={36} className="text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Bạn chưa có học phần nào.</p>
          <Link href="/hoc-phan/moi" className="btn-primary">
            Tạo học phần đầu tiên
          </Link>
        </div>
      )}
    </section>
  );
}

async function PublicSets() {
  const sets = await listPublicSets();
  if (!sets.length) {
    return <p className="text-sm text-muted-foreground">Chưa có học phần công khai nào.</p>;
  }
  return (
    <ul className={grid}>
      {sets.map((s) => (
        <li key={s.id}>
          <SetListItem set={s} showOwner />
        </li>
      ))}
    </ul>
  );
}
