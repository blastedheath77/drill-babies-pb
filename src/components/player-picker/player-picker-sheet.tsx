'use client';

import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCircles } from '@/hooks/use-circles';
import { useTodayRoster } from '@/hooks/use-today-roster';
import { CLUB_ID } from '@/config/club';
import { Chip, GroupChips, filterByGroups } from './group-chips';
import { PlayerAvatar } from './player-avatar';
import type { Circle, Player } from '@/lib/types';

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  title?: string;
  description?: string;
  /** Players that can't be picked here (e.g. already on the other team). */
  disabledIds?: string[];
  /** Shown first, e.g. people this player often partners. */
  priorityIds?: string[];
  /** Hide the "Here today" filter (e.g. when editing today's roster itself). */
  hideHereToday?: boolean;
}

interface SingleProps extends BaseProps {
  mode: 'single';
  selectedId?: string | null;
  onPick: (player: Player) => void;
}

interface MultipleProps extends BaseProps {
  mode: 'multiple';
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export type PlayerPickerSheetProps = SingleProps | MultipleProps;

/**
 * Bottom-sheet player picker used across the app: search, group chips,
 * "Here today" first, big tap targets.
 */
export function PlayerPickerSheet(props: PlayerPickerSheetProps) {
  const { open, onOpenChange, players, title = 'Choose players', description, disabledIds = [], priorityIds = [], hideHereToday = false } = props;
  const [query, setQuery] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const { data: groups = [] } = useCircles(CLUB_ID);
  const { roster } = useTodayRoster();
  const [hereOnly, setHereOnly] = useState(false);

  const selected = props.mode === 'multiple' ? props.selectedIds : props.selectedId ? [props.selectedId] : [];

  const list = useMemo(() => {
    let result = filterByGroups(players, groups as Circle[], groupIds);
    if (hereOnly) result = result.filter((p) => roster.includes(p.id));
    const q = query.trim().toLowerCase();
    if (q) result = result.filter((p) => p.name.toLowerCase().includes(q));
    const rank = (p: Player) =>
      (roster.includes(p.id) ? 0 : 2) + (priorityIds.includes(p.id) ? 0 : 1);
    return [...result].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [players, groups, groupIds, hereOnly, roster, query, priorityIds]);

  const toggle = (player: Player) => {
    if (disabledIds.includes(player.id)) return;
    if (props.mode === 'single') {
      props.onPick(player);
      onOpenChange(false);
      return;
    }
    props.onChange(
      selected.includes(player.id) ? selected.filter((id) => id !== player.id) : [...selected, player.id]
    );
  };

  const visibleIds = list.filter((p) => !disabledIds.includes(p.id)).map((p) => p.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col gap-3 p-4 rounded-t-2xl"
        // Don't pop up the phone keyboard on open; search is optional
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="text-left space-y-1">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players"
            className="pl-9 h-11"
            aria-label="Search players"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <GroupChips
          selected={groupIds}
          onChange={setGroupIds}
          extra={
            roster.length > 0 && !hideHereToday ? (
              <Chip active={hereOnly} onClick={() => setHereOnly((v) => !v)}>
                Here today ({roster.length})
              </Chip>
            ) : undefined
          }
        />

        {props.mode === 'multiple' && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{selected.length} selected</span>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-primary font-medium"
                onClick={() => props.onChange([...new Set([...selected, ...visibleIds])])}
              >
                Select shown
              </button>
              <button type="button" className="text-muted-foreground" onClick={() => props.onChange([])}>
                Clear
              </button>
            </div>
          </div>
        )}

        <ul className="flex-1 overflow-y-auto -mx-4 px-2" role="listbox" aria-multiselectable={props.mode === 'multiple'}>
          {list.length === 0 && <li className="text-center text-muted-foreground py-10">No players match</li>}
          {list.map((p) => {
            const isSelected = selected.includes(p.id);
            const isDisabled = disabledIds.includes(p.id) && !isSelected;
            return (
              <li key={p.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => toggle(p)}
                  className={cn(
                    'w-full flex items-center gap-3 px-2 h-14 rounded-lg text-left transition-colors',
                    isSelected ? 'bg-primary/10' : 'hover:bg-accent',
                    isDisabled && 'opacity-40'
                  )}
                >
                  <PlayerAvatar name={p.name} src={p.avatar} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{p.name}</span>
                    {!hideHereToday && roster.includes(p.id) && (
                      <span className="block text-xs text-primary">Here today</span>
                    )}
                  </span>
                  {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>

        {props.mode === 'multiple' && (
          <Button className="h-12 text-base" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
