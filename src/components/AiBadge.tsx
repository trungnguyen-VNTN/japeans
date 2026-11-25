import { Sparkle } from "@phosphor-icons/react/dist/ssr";

/** Marks AI-generated content that no editor has reviewed yet (icon + text, never color alone). */
export function AiBadge({ label = "AI · chưa duyệt" }: { label?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-secondary/40 bg-secondary/10 px-2 py-0.5 align-middle text-[11px] font-medium text-foreground"
      title="Nghĩa do AI dịch từ tiếng Anh, chưa được biên tập viên kiểm tra"
    >
      <Sparkle size={12} weight="fill" aria-hidden />
      {label}
    </span>
  );
}
