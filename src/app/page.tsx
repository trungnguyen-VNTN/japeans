import Link from "next/link";
import { Cards, PenNib, Translate } from "@phosphor-icons/react/dist/ssr";
import { SearchBox } from "@/components/SearchBox";

const EXAMPLES = ["勉強", "たべる", "sensei", "học sinh", "nhat ban", "beautiful"];

const FEATURES = [
  {
    icon: Translate,
    title: "Tra theo mọi cách gõ",
    body: "Kanji, kana, romaji, âm Hán Việt hay tiếng Anh đều ra đúng từ. Hơn 219.000 mục từ JMdict.",
  },
  {
    icon: PenNib,
    title: "Hiểu kanji tận gốc",
    body: "Âm Hán Việt, On/Kun, bộ thủ, thành phần cấu tạo và hoạt ảnh thứ tự nét cho hơn 6.000 chữ.",
  },
  {
    icon: Cards,
    title: "Học phần & ôn tập (sắp có)",
    body: "Lưu từ thành bộ thẻ, học bằng nhiều chế độ và ôn đúng lúc với thuật toán FSRS.",
  },
];

export default function Home() {
  return (
    <div className="space-y-12 py-6 md:py-12">
      <section className="mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="text-3xl font-bold leading-tight text-card-foreground md:text-5xl">
          Từ điển tiếng Nhật <span className="text-primary">cho người Việt</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Tra từ, hiểu kanji qua âm Hán Việt và bộ thủ, xem câu ví dụ thật.
        </p>
        <div className="text-left">
          <SearchBox size="lg" autoFocus />
        </div>
        <div className="flex flex-wrap justify-center gap-2" aria-label="Ví dụ tìm kiếm">
          {EXAMPLES.map((q) => (
            <Link
              key={q}
              href={`/tim-kiem?q=${encodeURIComponent(q)}`}
              className="min-h-9 rounded-full border border-border bg-card px-4 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary"
            >
              {q}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="features" className="space-y-4">
        <h2 id="features" className="sr-only">
          Tính năng
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-2xl border border-border bg-card p-6">
              <Icon size={28} className="text-primary" aria-hidden />
              <h3 className="mt-3 font-semibold text-card-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
