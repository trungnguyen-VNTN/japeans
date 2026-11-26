"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  addWordToSet as addWord,
  cloneSet as clone,
  createSet,
  deleteSet as remove,
  updateSet,
} from "@/lib/study-sets-db";
import { validateSet, type FieldErrors } from "@/lib/study-sets";

export type SaveResult = { ok: false; errors: FieldErrors } | undefined;

/** Create (setId null) or update a set. On success redirects to the set page; otherwise returns errors. */
export async function saveSet(setId: string | null, input: unknown): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, errors: { form: "Phiên đăng nhập đã hết. Hãy đăng nhập lại rồi lưu." } };

  const result = validateSet(input);
  if (!result.ok) return result;

  let id = setId;
  if (setId) {
    if (!(await updateSet(user.id, setId, result.data))) {
      return { ok: false, errors: { form: "Bạn không có quyền sửa học phần này." } };
    }
  } else {
    id = await createSet(user.id, result.data);
  }
  redirect(`/hoc-phan/${id}`);
}

export async function deleteSet(setId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  await remove(user.id, setId);
  redirect("/hoc-phan");
}

export async function cloneSet(setId: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/dang-nhap?callbackUrl=${encodeURIComponent(`/hoc-phan/${setId}`)}`);
  const id = await clone(user.id, setId);
  redirect(id ? `/hoc-phan/${id}/sua` : "/hoc-phan");
}

export type AddWordResult = "added" | "exists" | "forbidden" | "missing" | "signed-out";

export async function addWordToSet(setId: string, wordId: number): Promise<AddWordResult> {
  const user = await getCurrentUser();
  if (!user) return "signed-out";
  if (!Number.isInteger(wordId)) return "missing";
  return addWord(user.id, setId, wordId);
}
