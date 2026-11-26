import { db } from "@/lib/db";
import { parseDrawing, recognize } from "@/lib/recognize";
import { getTemplates } from "@/lib/recognize-data";

/**
 * POST /api/nhan-dang  { strokes: [[[x, y], …], …] }  (any coordinate space)
 * → { items: [{ character, hanViet, meaning }] } — the 10 most similar kanji.
 * Recognition runs on this server; drawings are not stored or sent anywhere.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const drawing = parseDrawing(body);
  if (!drawing) return Response.json({ error: "invalid drawing" }, { status: 400 });

  const ranked = recognize(drawing, await getTemplates(), 10);
  const info = await db.kanji.findMany({
    where: { character: { in: ranked.map((r) => r.character) } },
    select: { character: true, hanViet: true, meaningsVi: true, meaningsEn: true },
  });
  const byChar = new Map(info.map((k) => [k.character, k]));
  const items = ranked.map((r) => {
    const k = byChar.get(r.character);
    return {
      character: r.character,
      hanViet: k?.hanViet[0] ?? null,
      meaning: (k?.meaningsVi.length ? k.meaningsVi : k?.meaningsEn ?? []).slice(0, 2).join(", "),
    };
  });
  return Response.json({ items });
}
