"use client";

import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { CircleNotch, GoogleLogo, SignOut } from "@phosphor-icons/react";

export function GoogleSignInButton({ callbackUrl, disabled }: { callbackUrl: string; disabled?: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => {
        setPending(true);
        void signIn("google", { callbackUrl });
      }}
      className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 font-medium text-card-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <CircleNotch size={20} className="animate-spin" aria-hidden />
      ) : (
        <GoogleLogo size={20} weight="bold" aria-hidden />
      )}
      {pending ? "Đang chuyển tới Google…" : "Đăng nhập với Google"}
    </button>
  );
}

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl: "/" });
      }}
      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <SignOut size={18} aria-hidden />
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
  );
}
