import { connection } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  await connection(); // always run at request time, never prerender
  const checks: Record<string, string> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    checks.postgres = "ok";
  } catch (e) {
    checks.postgres = `error: ${(e as Error).message}`;
  }

  try {
    const res = await fetch(`${process.env.MEILI_HOST}/health`);
    checks.meilisearch = res.ok ? "ok" : `error: HTTP ${res.status}`;
  } catch (e) {
    checks.meilisearch = `error: ${(e as Error).message}`;
  }

  const ok = Object.values(checks).every((v) => v === "ok");
  return Response.json({ ok, checks }, { status: ok ? 200 : 503 });
}
