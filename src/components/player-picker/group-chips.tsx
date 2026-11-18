'use client';

import { cn } from '@/lib/utils';
import { useCircles } from '@/hooks/use-circles';
import { CLUB_ID } from '@/config/club';
import type { Circle } from '@/lib/types';

/** Toggleable chips for filtering players by group. Empty selection = everyone. */
export function GroupChips({
  selected,
  onChange,
  extra,
  className,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Extra chips rendered first, e.g. "Here today". */
  extra?: React.ReactNode;
  className?: string;
}) {
  const { data: groups = [] } = useCircles(CLUB_ID);
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (!extra && groups.length === 0) return null;

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none', className)}>
      {extra}
      {(groups as Circle[]).map((g) => (
        <Chip key={g.id} active={selected.includes(g.id)} onClick={() => toggle(g.id)}>
          {g.name}
        </Chip>
      ))}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3 h-8 text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-foreground border-border hover:bg-accent'
      )}
    >
      {children}
    </button>
  );
}

/** Players in any of the selected groups (all players when none selected). */
export function filterByGroups<T extends { id: string }>(players: T[], groups: Circle[], selected: string[]): T[] {
  if (selected.length === 0) return players;
  const allowed = new Set(groups.filter((g) => selected.includes(g.id)).flatMap((g) => g.playerIds));
  return players.filter((p) => allowed.has(p.id));
}
