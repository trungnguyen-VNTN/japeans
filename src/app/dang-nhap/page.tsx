import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { GoogleSignInButton } from "@/components/AuthButtons";
import { authConfigured, getCurrentUser } from "@/lib/auth";
import { safeCallbackPath, signInErrorMessage } from "@/lib/auth-config";

export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false } };

export default function SignInPage({ searchParams }: PageProps<"/dang-nhap">) {
  return (
    <div className="mx-auto max-w-md py-8">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-card-foreground">Đăng nhập Japeans</h1>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để lưu từ vào học phần, ôn tập theo lịch và giữ tiến độ học trên mọi thiết bị.
          </p>
        </header>
        <Suspense fallback={<div className="h-12 animate-pulse rounded-xl bg-muted" />}>
          <SignInForm searchParams={searchParams} />
        </Suspense>
        <p className="text-center text-xs text-muted-foreground">
          Japeans chỉ nhận tên, email và ảnh đại diện từ Google; không đăng bài hay truy cập dữ liệu khác.
        </p>
      </div>
    </div>
  );
}

async function SignInForm({ searchParams }: { searchParams: PageProps<"/dang-nhap">["searchParams"] }) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);

  const error = signInErrorMessage(typeof params.error === "string" ? params.error : undefined);
  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-card-foreground">
          <WarningCircle size={20} className="shrink-0 text-destructive" aria-hidden />
          {error}
        </p>
      )}
      {!authConfigured && (
        <p role="status" className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          Đăng nhập chưa được cấu hình trên máy chủ này (thiếu Google OAuth trong <code>.env</code>).
        </p>
      )}
      <GoogleSignInButton callbackUrl={callbackUrl} disabled={!authConfigured} />
    </div>
  );
}
