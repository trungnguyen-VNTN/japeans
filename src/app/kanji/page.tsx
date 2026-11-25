import type { Metadata } from "next";
import Link from "next/link";
import { getKanjiByGrade } from "@/lib/dictionary";

export const metadata: Metadata = {
  title: "Kanji theo cấp lớp",
  description: "1.026 kanji tiểu học Nhật Bản (kyōiku kanji) kèm âm Hán Việt, xếp theo lớp và độ phổ biến.",
};

export default async function KanjiIndexPage() {
  const groups = await getKanjiByGrade();
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-card-foreground">Kanji theo cấp lớp</h1>
        <p className="text-muted-foreground">
          Kanji học sinh Nhật học ở tiểu học (lớp 1–6), sắp theo độ phổ biến. Chọn một chữ để xem bộ thủ và thứ tự nét.
        </p>
        <nav aria-label="Chọn lớp" className="flex flex-wrap gap-2 pt-2">
          {groups.map(([grade, list]) => (
            <a
              key={grade}
              href={`#lop-${grade}`}
              className="min-h-9 rounded-full border border-border bg-card px-4 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary"
            >
              Lớp {grade} <span className="text-muted-foreground">({list.length})</span>
            </a>
          ))}
        </nav>
      </header>

      {groups.map(([grade, list]) => (
        <section key={grade} id={`lop-${grade}`} aria-labelledby={`h-lop-${grade}`} className="scroll-mt-20 space-y-3">
          <h2 id={`h-lop-${grade}`} className="text-xl font-semibold text-card-foreground">
            Lớp {grade}
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
            {list.map((k) => (
              <li key={k.character}>
                <Link
                  href={`/kanji/${encodeURIComponent(k.character)}`}
                  className="flex flex-col items-center rounded-xl border border-border bg-card py-2 transition-colors hover:border-primary hover:bg-muted"
                >
                  <span lang="ja" className="font-jp-serif text-3xl text-card-foreground">
                    {k.character}
                  </span>
                  <span className="mt-0.5 max-w-full truncate px-1 text-[11px] font-semibold uppercase text-primary">
                    {k.hanViet[0] ?? "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
