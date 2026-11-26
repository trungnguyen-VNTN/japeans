import "server-only";
import { db } from "@/lib/db";
import { makeTemplate, samplePathD, type Template } from "@/lib/recognize";

async function loadTemplates(): Promise<Template[]> {
  const rows = await db.kanji.findMany({
    where: { strokeSvg: { not: null } },
    select: { character: true, strokeSvg: true, frequency: true },
  });
  const templates: Template[] = [];
  for (const r of rows) {
    try {
      const paths = JSON.parse(r.strokeSvg!) as string[];
      templates.push(makeTemplate(r.character, paths.map((d) => samplePathD(d)), r.frequency));
    } catch {
      // a malformed path only drops that character
    }
  }
  return templates;
}

// Built once per server process (~6,400 characters) and kept in memory.
const globalForTemplates = globalThis as unknown as { kanjiTemplates?: Promise<Template[]> };

export function getTemplates(): Promise<Template[]> {
  globalForTemplates.kanjiTemplates ??= loadTemplates().catch((e) => {
    globalForTemplates.kanjiTemplates = undefined; // retry on the next request
    throw e;
  });
  return globalForTemplates.kanjiTemplates;
}
