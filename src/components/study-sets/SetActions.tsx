"use client";

import { useState, useTransition } from "react";
import { CircleNotch, Copy, Trash } from "@phosphor-icons/react";
import { cloneSet, deleteSet } from "@/app/hoc-phan/actions";

export function CloneButton({ setId }: { setId: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn-secondary" disabled={pending} onClick={() => start(() => cloneSet(setId))}>
      {pending ? <CircleNotch size={18} className="animate-spin" aria-hidden /> : <Copy size={18} aria-hidden />}
      Tạo bản sao để sửa
    </button>
  );
}

/** Two-step delete: the first click asks for confirmation (confirmation-dialogs). */
export function DeleteButton({ setId, title }: { setId: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className="btn-secondary text-destructive" onClick={() => setConfirming(true)}>
        <Trash size={18} aria-hidden />
        Xóa
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label="Xác nhận xóa học phần" className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2 pl-3 text-sm">
      <span className="text-card-foreground">
        Xóa vĩnh viễn “{title}” và tiến độ học của nó?
      </span>
      <button
        type="button"
        autoFocus
        className="btn-secondary border-destructive/40 text-destructive"
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Hủy
      </button>
      <button
        type="button"
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-on-destructive disabled:opacity-50"
        disabled={pending}
        onClick={() => start(() => deleteSet(setId))}
      >
        {pending && <CircleNotch size={18} className="animate-spin" aria-hidden />}
        Xóa vĩnh viễn
      </button>
    </div>
  );
}
