import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

/** "Common word" marker — icon + text, never color alone. */
export function CommonBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-strong">
      <CheckCircle size={14} weight="fill" aria-hidden />
      Thông dụng
    </span>
  );
}
