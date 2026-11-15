'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, RefreshCw, Repeat, UserPlus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getIdToken } from '@/lib/id-token';
import { logGame, removeGame } from '@/app/log-game/actions';
import { useTodayRoster } from '@/hooks/use-today-roster';
import { PlayerPickerSheet } from '@/components/player-picker/player-picker-sheet';
import { shortNames } from '@/lib/player-names';
import type { Player } from '@/lib/types';

type Format = 'doubles' | 'singles';
type Slot = 0 | 1 | 2 | 3; // doubles: 0,1 = team 1; 2,3 = team 2. singles: 0 = team 1; 2 = team 2

const DOUBLES_SLOTS: Slot[] = [0, 1, 2, 3];
const SINGLES_SLOTS: Slot[] = [0, 2];
const SCORES = Array.from({ length: 22 }, (_, i) => i);

export function LogGameClientPage({ players }: { players: Player[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { roster, setRoster } = useTodayRoster();
  const shortName = useMemo(() => shortNames(players), [players]);
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const [format, setFormat] = useState<Format>('doubles');
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null]);
  const [scores, setScores] = useState<[number | null, number | null]>([null, null]);
  const [activeTeam, setActiveTeam] = useState<0 | 1>(0);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [lastGameId, setLastGameId] = useState<string | null>(null);
  const [rosterPickerOpen, setRosterPickerOpen] = useState(false);
  const [morePickerOpen, setMorePickerOpen] = useState(false);

  const usedSlots = format === 'doubles' ? DOUBLES_SLOTS : SINGLES_SLOTS;
  const assigned = usedSlots.map((s) => slots[s]).filter((x): x is string => !!x);
  const team1 = (format === 'doubles' ? [slots[0], slots[1]] : [slots[0]]).filter((x): x is string => !!x);
  const team2 = (format === 'doubles' ? [slots[2], slots[3]] : [slots[2]]).filter((x): x is string => !!x);
  const perTeam = format === 'doubles' ? 2 : 1;
  const teamsComplete = team1.length === perTeam && team2.length === perTeam;
  const canSave = teamsComplete && scores[0] !== null && scores[1] !== null && !saving;

  // Chips: today's roster if one is set, otherwise everyone
  const chipPlayers = useMemo(() => {
    const base = roster.length > 0 ? players.filter((p) => roster.includes(p.id)) : players;
    const extra = assigned
      .filter((id) => !base.some((p) => p.id === id))
      .map((id) => playersById.get(id))
      .filter((p): p is Player => !!p);
    return [...base, ...extra].sort((a, b) => (shortName.get(a.id) ?? '').localeCompare(shortName.get(b.id) ?? ''));
  }, [roster, players, assigned, playersById, shortName]);

  const assign = (playerId: string) => {
    setJustSaved(false);
    const existing = slots.findIndex((id) => id === playerId);
    if (existing !== -1) {
      setSlots((prev) => prev.map((id, i) => (i === existing ? null : id)));
      return;
    }
    const free = usedSlots.find((s) => !slots[s]);
    if (free === undefined) {
      toast({ title: 'Teams are full', description: 'Tap a player in a team to remove them first.' });
      return;
    }
    setSlots((prev) => prev.map((id, i) => (i === free ? playerId : id)));
  };

  const clearSlot = (slot: Slot) => {
    setJustSaved(false);
    setSlots((prev) => prev.map((id, i) => (i === slot ? null : id)));
  };

  const setScore = (value: number) => {
    setScores((prev) => (activeTeam === 0 ? [value, prev[1]] : [prev[0], value]));
    if (activeTeam === 0) setActiveTeam(1);
  };

  const changeFormat = (next: Format) => {
    setFormat(next);
    setJustSaved(false);
    if (next === 'singles') setSlots((prev) => [prev[0], null, prev[2], null]);
  };

  const refreshData = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['players'] }),
      queryClient.invalidateQueries({ queryKey: ['games'] }),
    ]);

  const undo = async (gameId: string) => {
    try {
      await removeGame(await getIdToken(), gameId);
      await refreshData();
      setJustSaved(false);
      setLastGameId(null);
      toast({ title: 'Game removed' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not undo', description: (error as Error).message });
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const game = { team1PlayerIds: team1, team2PlayerIds: team2, team1Score: scores[0]!, team2Score: scores[1]! };
    const label = (ids: string[]) => ids.map((id) => shortName.get(id)).join(' & ');
    try {
      const { gameId } = await logGame(await getIdToken(), game);
      setScores([null, null]);
      setActiveTeam(0);
      setJustSaved(true);
      setLastGameId(gameId);
      toast({
        duration: 10000,
        title: 'Game saved',
        description: `${label(team1)} ${game.team1Score}–${game.team2Score} ${label(team2)}`,
        action: (
          <ToastAction altText="Undo saving this game" onClick={() => undo(gameId)}>
            Undo
          </ToastAction>
        ),
      });
      refreshData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save game', description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const rematch = () => {
    setJustSaved(false);
    setScores([null, null]);
    setActiveTeam(0);
  };

  // A & B v C & D  ->  A & C v B & D
  const swapPartners = () => {
    setSlots((prev) => [prev[0], prev[2], prev[1], prev[3]]);
    rematch();
  };

  const newGame = () => {
    setSlots([null, null, null, null]);
    rematch();
  };

  const renderTeam = (team: 0 | 1, slotIds: Slot[]) => {
    const score = scores[team];
    const isActive = teamsComplete && activeTeam === team;
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border p-2 transition-colors',
          isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border'
        )}
      >
        <span className="text-xs font-semibold text-muted-foreground w-12 shrink-0 pl-1">Team {team + 1}</span>
        <div className="flex-1 flex gap-2 min-w-0">
          {slotIds.map((slot) => {
            const id = slots[slot];
            return id ? (
              <button
                key={slot}
                type="button"
                onClick={() => clearSlot(slot)}
                className={cn(
                  'flex-1 min-w-0 h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-1 px-2 text-white',
                  team === 0 ? 'bg-blue-600' : 'bg-orange-500'
                )}
                aria-label={`Remove ${playersById.get(id)?.name ?? 'player'} from team ${team + 1}`}
              >
                <span className="truncate">{shortName.get(id)}</span>
                <X className="h-3 w-3 shrink-0 opacity-70" />
              </button>
            ) : (
              <div
                key={slot}
                className="flex-1 h-11 rounded-lg border border-dashed text-xs text-muted-foreground flex items-center justify-center"
              >
                Tap a player
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setActiveTeam(team)}
          disabled={!teamsComplete}
          className={cn(
            'w-14 h-11 rounded-lg border text-xl font-mono font-semibold shrink-0',
            score === null && 'text-muted-foreground',
            isActive && 'border-primary'
          )}
          aria-label={`Team ${team + 1} score`}
        >
          {score ?? '–'}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto pb-28">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-2xl font-bold">Log game</h1>
        <div className="flex rounded-lg border p-0.5" role="radiogroup" aria-label="Game type">
          {(['doubles', 'singles'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              onClick={() => changeFormat(f)}
              className={cn(
                'px-3 h-8 rounded-md text-sm font-medium capitalize',
                format === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {renderTeam(0, format === 'doubles' ? [0, 1] : [0])}
        {renderTeam(1, format === 'doubles' ? [2, 3] : [2])}
      </div>

      {/* Always rendered so the layout doesn't jump when the 4th player is picked */}
      <div className={cn('mb-4 transition-opacity', !teamsComplete && 'opacity-40')} aria-disabled={!teamsComplete}>
        <p className="text-sm text-muted-foreground mb-2">
          {teamsComplete ? (
            <>
              Score for <span className="font-medium text-foreground">Team {activeTeam + 1}</span>
            </>
          ) : (
            'Pick the players, then the score'
          )}
        </p>
        <div className="grid grid-cols-8 gap-1.5">
          {SCORES.map((n) => (
            <button
              key={n}
              type="button"
              disabled={!teamsComplete}
              onClick={() => setScore(n)}
              className={cn(
                'h-10 rounded-lg border font-mono text-base',
                teamsComplete && scores[activeTeam] === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-accent'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {justSaved && teamsComplete && (
        <div className="rounded-xl border bg-muted/40 p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" /> Saved. Next game?
            </p>
            {lastGameId && (
              <button type="button" className="text-sm text-muted-foreground underline" onClick={() => undo(lastGameId)}>
                Undo
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={rematch} className="flex-1">
              <Repeat className="h-4 w-4 mr-1" /> Rematch
            </Button>
            {format === 'doubles' && (
              <Button variant="outline" size="sm" onClick={swapPartners} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-1" /> Swap
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={newGame} className="flex-1">
              New players
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">{roster.length > 0 ? `Here today (${roster.length})` : 'Players'}</h2>
        <div className="flex gap-3 text-sm">
          <button
            type="button"
            className="text-primary font-medium flex items-center gap-1"
            onClick={() => setRosterPickerOpen(true)}
          >
            <Users className="h-4 w-4" /> {roster.length > 0 ? 'Edit who’s here' : 'Who’s here?'}
          </button>
          {roster.length > 0 && (
            <button
              type="button"
              className="text-muted-foreground flex items-center gap-1"
              onClick={() => setMorePickerOpen(true)}
            >
              <UserPlus className="h-4 w-4" /> Other
            </button>
          )}
        </div>
      </div>

      {players.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No players yet.{' '}
          <Link href="/players/add" className="text-primary">
            Add a player
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chipPlayers.map((p) => {
            const slotIndex = slots.findIndex((id) => id === p.id);
            const team = slotIndex === -1 ? null : slotIndex < 2 ? 1 : 2;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => assign(p.id)}
                aria-pressed={team !== null}
                className={cn(
                  'h-11 px-4 rounded-full border text-sm font-medium transition-colors',
                  team === 1 && 'bg-blue-600 text-white border-blue-600',
                  team === 2 && 'bg-orange-500 text-white border-orange-500',
                  team === null && 'bg-background hover:bg-accent'
                )}
              >
                {shortName.get(p.id)}
              </button>
            );
          })}
        </div>
      )}

      {/* Save bar, above the mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-20 md:bottom-0 px-3 pt-2 pb-2 z-30 bg-background/95 backdrop-blur border-t md:border-0 md:bg-transparent">
        <div className="max-w-xl mx-auto">
          <Button onClick={save} disabled={!canSave} className="w-full h-12 text-base shadow-lg">
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : !teamsComplete ? (
              'Pick the players'
            ) : scores[0] === null || scores[1] === null ? (
              'Enter the score'
            ) : (
              'Save game'
            )}
          </Button>
        </div>
      </div>

      <PlayerPickerSheet
        open={rosterPickerOpen}
        onOpenChange={setRosterPickerOpen}
        mode="multiple"
        players={players}
        selectedIds={roster}
        onChange={setRoster}
        title="Who's here today?"
        hideHereToday
        description="Only these players are shown while logging. Remembered on this phone until tomorrow."
      />
      <PlayerPickerSheet
        open={morePickerOpen}
        onOpenChange={setMorePickerOpen}
        mode="single"
        players={players}
        disabledIds={assigned}
        onPick={(p) => assign(p.id)}
        title="Add another player"
      />
    </div>
  );
}
