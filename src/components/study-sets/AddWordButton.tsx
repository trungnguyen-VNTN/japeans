"use client";

import { useState, useTransition } from "react";
import { Check, CircleNotch, Plus } from "@phosphor-icons/react";
import { addWordToSet, type AddWordResult } from "@/app/hoc-phan/actions";

const MESSAGES: Record<AddWordResult, string> = {
  added: "Đã thêm",
  exists: "Đã có trong học phần",
  forbidden: "Không có quyền",
  missing: "Không tìm thấy từ",
  "signed-out": "Hãy đăng nhập lại",
};

export function AddWordButton({ setId, wordId, alreadyIn }: { setId: string; wordId: number; alreadyIn: boolean }) {
  const [result, setResult] = useState<AddWordResult | null>(alreadyIn ? "exists" : null);
  const [pending, start] = useTransition();
  const done = result === "added" || result === "exists";

  return (
    <div className="flex items-center gap-3">
      <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {result && MESSAGES[result]}
      </span>
      <button
        type="button"
        disabled={pending || done}
        onClick={() => start(async () => setResult(await addWordToSet(setId, wordId)))}
        className="btn-secondary"
      >
        {pending ? (
          <CircleNotch size={18} className="animate-spin" aria-hidden />
        ) : done ? (
          <Check size={18} aria-hidden />
        ) : (
          <Plus size={18} aria-hidden />
        )}
        {done ? "Đã thêm" : "Thêm"}
      </button>
    </div>
  );
}
