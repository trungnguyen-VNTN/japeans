import Link from "next/link";
import { Suspense } from "react";
import { BookOpenText, Cards, MagnifyingGlass, PenNib } from "@phosphor-icons/react/dist/ssr";
import { AccountMenu } from "@/components/AccountMenu";

const NAV = [
  { href: "/", label: "Tra từ", icon: MagnifyingGlass },
  { href: "/kanji", label: "Kanji", icon: PenNib },
  { href: "/hoc-phan", label: "Học phần", icon: Cards },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-4 md:px-6">
        <Link href="/" aria-label="Japeans – trang chủ" className="flex items-center gap-2 font-bold text-primary">
          <BookOpenText size={24} weight="fill" aria-hidden />
          <span className="hidden text-lg sm:inline">Japeans</span>
        </Link>

        <nav aria-label="Chính" className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-lg px-2 text-[11px] font-medium leading-none transition-colors hover:bg-muted sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm"
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        {/* Reads the session cookie: streamed in so the rest of the header stays static. */}
        <Suspense fallback={<span className="size-11" aria-hidden />}>
          <AccountMenu />
        </Suspense>
      </div>
    </header>
  );
}
