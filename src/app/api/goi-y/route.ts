import type { NextRequest } from "next/server";
import { suggestQuery, SUGGEST_LIMIT } from "@/lib/autocomplete";
import { searchDictionary } from "@/lib/dictionary";

/** GET /api/goi-y?q=… → up to 8 word suggestions for the search box. */
export async function GET(request: NextRequest) {
  const q = suggestQuery(request.nextUrl.searchParams.get("q") ?? "");
  if (!q) return Response.json({ items: [] });

  const { words } = await searchDictionary(q);
  const items = words.slice(0, SUGGEST_LIMIT).map((w) => ({
    id: w.id,
    headword: w.headword,
    reading: w.reading,
    hanViet: w.hanViet[0] ?? null,
    preview: w.preview,
  }));
  return Response.json({ items }, { headers: { "Cache-Control": "public, max-age=300" } });
}
