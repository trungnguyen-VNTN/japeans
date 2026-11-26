/**
 * Offline check of handwriting recognition on synthetic drawings: KanjiVG strokes of common kanji
 * with random scale, offset, jitter and (sometimes) swapped stroke order.
 * Real handwriting is messier, so treat the numbers as an upper bound.
 *
 *   npx tsx scripts/eval-recognition.ts [samples]
 */
import "dotenv/config";
import { makeTemplate, recognize, samplePathD, type Template } from "../src/lib/recognize";
import { db, run } from "./import/lib";

let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);

run(async () => {
  const count = Number(process.argv[2] ?? 300);
  const rows = await db.kanji.findMany({
    where: { strokeSvg: { not: null } },
    select: { character: true, strokeSvg: true, frequency: true, grade: true },
  });
  const t0 = Date.now();
  const templates: Template[] = rows.map((r) =>
    makeTemplate(r.character, (JSON.parse(r.strokeSvg!) as string[]).map((d) => samplePathD(d)), r.frequency),
  );
  console.log(`Built ${templates.length} templates in ${Date.now() - t0} ms`);

  const pool = rows.filter((r) => r.grade && r.grade <= 8);
  let top1 = 0;
  let top5 = 0;
  let totalMs = 0;
  const misses: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = pool[Math.floor(rand() * pool.length)];
    const k = 1 + rand() * 2;
    const dx = rand() * 80;
    const dy = rand() * 80;
    // Messy handwriting: per-stroke shift (±6) and length change (±20%), slight slant, point jitter.
    const shear = (rand() - 0.5) * 0.25;
    let strokes = (JSON.parse(r.strokeSvg!) as string[]).map((d) => {
      const pts = samplePathD(d, 4);
      const sx = (rand() - 0.5) * 12;
      const sy = (rand() - 0.5) * 12;
      const grow = 0.8 + rand() * 0.4;
      const c = pts[Math.floor(pts.length / 2)];
      return pts.map((p) => {
        const x = c.x + (p.x - c.x) * grow + sx + (rand() - 0.5) * 4;
        const y = c.y + (p.y - c.y) * grow + sy + (rand() - 0.5) * 4;
        return { x: (x + shear * (y - 55)) * k + dx, y: y * k + dy };
      });
    });
    if (strokes.length > 2 && rand() < 0.3) {
      const j = Math.floor(rand() * (strokes.length - 1));
      strokes = [...strokes.slice(0, j), strokes[j + 1], strokes[j], ...strokes.slice(j + 2)];
    }
    const t = Date.now();
    const res = recognize(strokes, templates, 10, 2, Number(process.env.SHORTLIST ?? 600)).map((x) => x.character);
    totalMs += Date.now() - t;
    if (res[0] === r.character) top1++;
    if (res.slice(0, 5).includes(r.character)) top5++;
    else if (misses.length < 15) misses.push(`${r.character}→${res.slice(0, 3).join("")}`);
  }
  console.log(`Top-1 ${((top1 / count) * 100).toFixed(1)}% · Top-5 ${((top5 / count) * 100).toFixed(1)}% · avg ${(totalMs / count).toFixed(1)} ms/query`);
  if (misses.length) console.log("Missed (top-5):", misses.join(" "));
});
