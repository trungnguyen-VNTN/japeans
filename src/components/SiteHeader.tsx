import Link from "next/link";
import { Suspense } from "react";
import { BookOpenText, Cards, MagnifyingGlass, PenNib } from "@phosphor-icons/react/dist/ssr";
import { AccountMenu } from "@/components/AccountMenu";

const NAV = [
  { href: "/", label: "Tra từ", icon: MagnifyingGlass },
  { href: "/kanji", label: "Kanji", icon: PenNib },
  { href: "/hoc-phan", label: "Học phần", icon: Cards, soon: true },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <BookOpenText size={24} weight="fill" aria-hidden />
          <span className="text-lg">Japeans</span>
        </Link>

        <nav aria-label="Chính" className="ml-auto flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon, soon }) =>
            soon ? (
              <span
                key={href}
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground sm:flex"
                title="Sắp ra mắt"
              >
                <Icon size={18} aria-hidden />
                {label}
                <span className="rounded-full bg-muted px-1.5 text-[11px]">sắp có</span>
              </span>
            ) : (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            ),
          )}
        </nav>

        {/* Reads the session cookie: streamed in so the rest of the header stays static. */}
        <Suspense fallback={<span className="size-11" aria-hidden />}>
          <AccountMenu />
        </Suspense>
      </div>
    </header>
  );
}
