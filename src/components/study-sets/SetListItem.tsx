import Link from "next/link";
import { Cards, Globe, LinkSimple, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { VISIBILITY_LABELS, type Visibility } from "@/lib/study-sets";

const ICONS = { PRIVATE: LockSimple, UNLISTED: LinkSimple, PUBLIC: Globe } as const;

type Item = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  owner: { name: string | null };
  _count: { cards: number };
};

export function SetListItem({ set, showOwner }: { set: Item; showOwner?: boolean }) {
  const v = set.visibility as Visibility;
  const Icon = ICONS[v];
  return (
    <Link
      href={`/hoc-phan/${set.id}`}
      className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
    >
      <span className="font-semibold text-card-foreground">{set.title}</span>
      {set.description && <span className="line-clamp-2 text-sm text-muted-foreground">{set.description}</span>}
      <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Cards size={14} aria-hidden />
          {set._count.cards} thẻ
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon size={14} aria-hidden />
          {VISIBILITY_LABELS[v].label}
        </span>
        {showOwner && set.owner.name && <span>bởi {set.owner.name}</span>}
      </span>
    </Link>
  );
}
