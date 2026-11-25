import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { SearchInput } from "@/components/SearchInput";

type Props = {
  defaultValue?: string;
  size?: "lg" | "md";
  autoFocus?: boolean;
};

/** GET form → /tim-kiem?q=… (works without JavaScript, shareable URLs) with live suggestions. */
export function SearchBox({ defaultValue, size = "md", autoFocus }: Props) {
  const lg = size === "lg";
  return (
    <form action="/tim-kiem" role="search" className="w-full">
      <label htmlFor="q" className="sr-only">
        Tìm từ hoặc kanji
      </label>
      <div
        className={`relative flex items-center gap-2 rounded-xl border border-border bg-card shadow-sm transition-shadow focus-within:border-primary focus-within:shadow-md ${
          lg ? "p-2" : "p-1.5"
        }`}
      >
        <MagnifyingGlass size={lg ? 24 : 20} className="ml-2 shrink-0 text-muted-foreground" aria-hidden />
        {/* key: reset the input when the page's query changes */}
        <SearchInput key={defaultValue ?? ""} defaultValue={defaultValue} large={lg} autoFocus={autoFocus} />
        <button
          type="submit"
          className={`shrink-0 cursor-pointer rounded-lg bg-primary font-medium text-on-primary transition-opacity hover:opacity-90 ${
            lg ? "h-12 px-6" : "h-10 px-4"
          }`}
        >
          Tra
        </button>
      </div>
      <p id="q-help" className="mt-2 text-sm text-muted-foreground">
        Nhập kanji, hiragana/katakana, romaji, âm Hán Việt (có hoặc không dấu) hoặc tiếng Anh.
      </p>
    </form>
  );
}
