export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card text-sm text-muted-foreground">
      <div className="mx-auto max-w-5xl space-y-1 px-4 py-6 md:px-6">
        <p>
          Dữ liệu từ điển:{" "}
          <a className="underline hover:text-primary" href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project">
            JMdict
          </a>
          ,{" "}
          <a className="underline hover:text-primary" href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project">
            KANJIDIC2
          </a>
          , RADKFILE/KRADFILE © EDRDG (CC BY-SA 4.0) ·{" "}
          <a className="underline hover:text-primary" href="https://kanjivg.tagaini.net/">
            KanjiVG
          </a>{" "}
          © Ulrich Apel (CC BY-SA 3.0) ·{" "}
          <a className="underline hover:text-primary" href="https://tatoeba.org/">
            Tatoeba
          </a>{" "}
          (CC BY 2.0 FR) · Unicode Unihan.
        </p>
        <p>Nghĩa tiếng Việt đang được biên soạn: phần có nhãn “AI” do AI dịch từ nghĩa tiếng Anh và chưa được kiểm tra; từ chưa có bản dịch hiển thị nghĩa tiếng Anh gốc.</p>
      </div>
    </footer>
  );
}
