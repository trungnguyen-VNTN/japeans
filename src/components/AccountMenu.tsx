import Link from "next/link";
import { SignIn } from "@phosphor-icons/react/dist/ssr";
import { UserAvatar } from "@/components/UserAvatar";
import { getCurrentUser } from "@/lib/auth";

/** Header slot: avatar link to the account page, or a sign-in link. Render inside <Suspense>. */
export async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link
        href="/dang-nhap"
        className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-muted sm:px-3"
      >
        <SignIn size={18} aria-hidden />
        {/* icon-only on narrow phones; the text stays available to screen readers */}
        <span className="sr-only sm:not-sr-only">Đăng nhập</span>
      </Link>
    );
  }
  return (
    <Link
      href="/tai-khoan"
      aria-label={`Tài khoản của ${user.name ?? user.email ?? "bạn"}`}
      className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-muted"
    >
      <UserAvatar name={user.name} image={user.image} />
    </Link>
  );
}
