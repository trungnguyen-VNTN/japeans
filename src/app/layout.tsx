import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// CJK fonts are large: load on demand instead of preloading.
const notoJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const notoSerifJp = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: ["500", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "Japeans — Từ điển & học tiếng Nhật", template: "%s · Japeans" },
  description:
    "Tra từ tiếng Nhật bằng kanji, kana, romaji hoặc Hán Việt. Phân tích kanji theo bộ thủ, thứ tự nét và câu ví dụ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${notoJp.variable} ${notoSerifJp.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2"
        >
          Bỏ qua tới nội dung
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
