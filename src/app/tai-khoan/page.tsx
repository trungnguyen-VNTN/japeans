import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/AuthButtons";
import { UserAvatar } from "@/components/UserAvatar";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Tài khoản", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold text-card-foreground">Tài khoản</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-card" />}>
        <AccountDetails />
      </Suspense>
    </div>
  );
}

async function AccountDetails() {
  const user = await requireUser("/tai-khoan");
  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { createdAt: true, dailyGoal: true, streak: true, xp: true },
  });

  return (
    <>
      <section aria-labelledby="profile" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <UserAvatar name={user.name} image={user.image} size={64} />
        <div className="min-w-0">
          <h2 id="profile" className="truncate text-xl font-semibold text-card-foreground">
            {user.name ?? "Người học"}
          </h2>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          {profile && (
            <p className="text-xs text-muted-foreground">
              Tham gia ngày {profile.createdAt.toLocaleDateString("vi-VN")}
            </p>
          )}
        </div>
      </section>

      {profile && (
        <section aria-labelledby="stats" className="rounded-2xl border border-border bg-card p-6">
          <h2 id="stats" className="text-sm font-medium text-muted-foreground">
            Tiến độ
          </h2>
          <dl className="mt-3 grid grid-cols-3 gap-4 text-center">
            {[
              ["Chuỗi ngày học", profile.streak],
              ["Điểm XP", profile.xp],
              ["Mục tiêu mỗi ngày", `${profile.dailyGoal} thẻ`],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-card-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">Học phần và ôn tập sẽ được ghi vào đây khi ra mắt.</p>
        </section>
      )}

      {/* Sign-out kept apart from other actions (destructive-nav-separation). */}
      <div className="flex justify-end border-t border-border pt-6">
        <SignOutButton />
      </div>
    </>
  );
}
