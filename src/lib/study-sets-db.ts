import "server-only";
import { db } from "@/lib/db";
import { canEdit, canView, type ValidSet, type Visibility } from "@/lib/study-sets";

const listSelect = {
  id: true,
  title: true,
  description: true,
  visibility: true,
  updatedAt: true,
  owner: { select: { name: true } },
  _count: { select: { cards: true } },
} as const;

export async function listMySets(userId: string) {
  return db.studySet.findMany({ where: { ownerId: userId }, select: listSelect, orderBy: { updatedAt: "desc" } });
}

export async function listPublicSets(limit = 30) {
  return db.studySet.findMany({
    where: { visibility: "PUBLIC" },
    select: listSelect,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

/** The set with its cards if the viewer may see it, else null (private sets look "not found"). */
export async function getSetForViewer(id: string, viewerId: string | null) {
  const set = await db.studySet.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, image: true } },
      cards: { orderBy: { order: "asc" } },
      cloneOf: { select: { id: true, title: true, visibility: true } },
    },
  });
  if (!set || !canView({ ownerId: set.ownerId, visibility: set.visibility as Visibility }, viewerId)) return null;
  return { ...set, editable: canEdit(set, viewerId) };
}

/** Drop wordId values that do not exist in the dictionary (client-supplied, so never trusted). */
async function checkedWordIds(cards: ValidSet["cards"]) {
  const ids = [...new Set(cards.map((c) => c.wordId).filter((id): id is number => id !== null))];
  if (!ids.length) return new Set<number>();
  const found = await db.word.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return new Set(found.map((w) => w.id));
}

export async function createSet(ownerId: string, data: ValidSet) {
  const words = await checkedWordIds(data.cards);
  const set = await db.studySet.create({
    data: {
      ownerId,
      title: data.title,
      description: data.description || null,
      visibility: data.visibility,
      tags: data.tags,
      cards: {
        create: data.cards.map((c, order) => ({
          order,
          term: c.term,
          reading: c.reading || null,
          definition: c.definition,
          wordId: c.wordId && words.has(c.wordId) ? c.wordId : null,
        })),
      },
    },
    select: { id: true },
  });
  return set.id;
}

/**
 * Update a set the user owns. Cards that keep their id are updated in place (their study progress
 * stays), new cards are created, cards no longer present are deleted. Returns false if not the owner.
 */
export async function updateSet(ownerId: string, setId: string, data: ValidSet): Promise<boolean> {
  const existing = await db.studySet.findUnique({
    where: { id: setId },
    select: { ownerId: true, cards: { select: { id: true } } },
  });
  if (!existing || existing.ownerId !== ownerId) return false;

  const words = await checkedWordIds(data.cards);
  const ownIds = new Set(existing.cards.map((c) => c.id));
  const keptIds = new Set(data.cards.map((c) => c.id).filter((id): id is string => !!id && ownIds.has(id)));

  await db.$transaction([
    db.studySet.update({
      where: { id: setId },
      data: {
        title: data.title,
        description: data.description || null,
        visibility: data.visibility,
        tags: data.tags,
      },
    }),
    db.setCard.deleteMany({ where: { setId, id: { notIn: [...keptIds] } } }),
    ...data.cards.map((c, order) => {
      const fields = {
        order,
        term: c.term,
        reading: c.reading || null,
        definition: c.definition,
        wordId: c.wordId && words.has(c.wordId) ? c.wordId : null,
      };
      return c.id && keptIds.has(c.id)
        ? db.setCard.update({ where: { id: c.id }, data: fields })
        : db.setCard.create({ data: { ...fields, setId } });
    }),
  ]);
  return true;
}

export async function deleteSet(ownerId: string, setId: string): Promise<boolean> {
  const res = await db.studySet.deleteMany({ where: { id: setId, ownerId } });
  return res.count > 0;
}

/** Copy a set the user can view into their own private set. Returns the new id, or null. */
export async function cloneSet(userId: string, setId: string): Promise<string | null> {
  const source = await getSetForViewer(setId, userId);
  if (!source) return null;
  const copy = await db.studySet.create({
    data: {
      ownerId: userId,
      title: `${source.title} (bản sao)`.slice(0, 120),
      description: source.description,
      visibility: "PRIVATE",
      tags: source.tags,
      cloneOfId: source.id,
      cards: {
        create: source.cards.map((c) => ({
          order: c.order,
          term: c.term,
          reading: c.reading,
          definition: c.definition,
          wordId: c.wordId,
        })),
      },
    },
    select: { id: true },
  });
  return copy.id;
}

/** Card fields for a dictionary word: headword, reading, first meanings (Vietnamese first). */
export async function cardFromWord(wordId: number) {
  const w = await db.word.findUnique({
    where: { id: wordId },
    include: {
      kanjiForms: { orderBy: { order: "asc" }, take: 1 },
      readings: { orderBy: { order: "asc" }, take: 1 },
      senses: { orderBy: { order: "asc" }, take: 3 },
    },
  });
  if (!w) return null;
  const usuallyKana = w.senses[0]?.misc.includes("uk");
  const term = (!usuallyKana && w.kanjiForms[0]?.text) || w.readings[0]?.kana || "";
  const reading = w.readings[0]?.kana && w.readings[0].kana !== term ? w.readings[0].kana : "";
  const definition = w.senses
    .map((s) => (s.glossVi.length ? s.glossVi : s.glossEn).slice(0, 3).join(", "))
    .join("; ")
    .slice(0, 500);
  return { term, reading, definition, wordId: w.id };
}

/** Append a dictionary word to a set the user owns (no-op if already there). */
export async function addWordToSet(ownerId: string, setId: string, wordId: number) {
  const set = await db.studySet.findUnique({
    where: { id: setId },
    select: { ownerId: true, cards: { select: { wordId: true, order: true }, orderBy: { order: "desc" } } },
  });
  if (!set || set.ownerId !== ownerId) return "forbidden" as const;
  if (set.cards.some((c) => c.wordId === wordId)) return "exists" as const;
  const card = await cardFromWord(wordId);
  if (!card) return "missing" as const;
  await db.$transaction([
    db.setCard.create({
      data: { setId, order: (set.cards[0]?.order ?? -1) + 1, ...card, reading: card.reading || null },
    }),
    db.studySet.update({ where: { id: setId }, data: { updatedAt: new Date() } }),
  ]);
  return "added" as const;
}
