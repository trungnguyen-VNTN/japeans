import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

type Props = {
  defaultValue?: string;
  size?: "lg" | "md";
  autoFocus?: boolean;
};

/** Plain GET form → /tim-kiem?q=… (works without JavaScript, shareable URLs). */
export function SearchBox({ defaultValue, size = "md", autoFocus }: Props) {
  const lg = size === "lg";
  return (
    <form action="/tim-kiem" role="search" className="w-full">
      <label htmlFor="q" className="sr-only">
        Tìm từ hoặc kanji
      </label>
      <div
        className={`flex items-center gap-2 rounded-xl border border-border bg-card shadow-sm transition-shadow focus-within:border-primary focus-within:shadow-md ${
          lg ? "p-2" : "p-1.5"
        }`}
      >
        <MagnifyingGlass size={lg ? 24 : 20} className="ml-2 shrink-0 text-muted-foreground" aria-hidden />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          placeholder="勉強, べんきょう, benkyou, học sinh, study…"
          aria-describedby="q-help"
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70 ${
            lg ? "h-12 text-lg" : "h-10 text-base"
          }`}
        />
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
