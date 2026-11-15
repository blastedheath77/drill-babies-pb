'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  Coffee,
  Flag,
  Loader2,
  Minus,
  MoreVertical,
  Plus,
  Shuffle,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { usePlayers } from '@/hooks/use-players';
import { useRefreshTournament, type TournamentDetail } from '@/hooks/use-tournament-detail';
import { PlayerPickerSheet } from '@/components/player-picker/player-picker-sheet';
import { ScoreEntrySheet } from '@/components/courtside/score-entry-sheet';
import { getIdToken } from '@/lib/id-token';
import { recordTournamentMatchResult } from '@/app/tournaments/match-actions';
import { deleteTournament } from '@/app/tournaments/delete-actions';
import {
  addQuickPlayRound,
  deleteQuickPlayRound,
  endSession,
  isSessionStale,
  setSessionCourts,
  setSessionPlayers,
} from '@/app/tournaments/quick-play-actions';
import { shortNames } from '@/lib/player-names';
import { CLUB_ID } from '@/config/club';
import { cn } from '@/lib/utils';
import type { TournamentMatch } from '@/lib/types';

function teams(m: TournamentMatch): [string[], string[]] {
  if (m.player1Id && m.player2Id) return [[m.player1Id], [m.player2Id]];
  return [m.team1PlayerIds ?? [], m.team2PlayerIds ?? []];
}

export function QuickPlaySession({ detail }: { detail: TournamentDetail }) {
  const { tournament, matches, standings, scores, playerMap } = detail;
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin, canCreateTournaments } = useAuth();
  const refreshTournament = useRefreshTournament();
  const queryClient = useQueryClient();
  const { data: allPlayers = [] } = usePlayers(CLUB_ID);

  const [busy, setBusy] = useState<string | null>(null);
  const [scoring, setScoring] = useState<TournamentMatch | null>(null);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [playersDraft, setPlayersDraft] = useState<string[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canRun = canCreateTournaments();
  const ended = tournament.status === 'completed';
  const stale = isSessionStale(tournament);
  const names = useMemo(() => {
    const byId = new Map([...allPlayers, ...playerMap.values()].map((p) => [p.id, p]));
    return shortNames([...byId.values()]);
  }, [playerMap, allPlayers]);
  const label = (ids: string[]) => ids.map((id) => names.get(id) ?? playerMap.get(id)?.name ?? '?').join(' & ');

  const rounds = useMemo(() => {
    const byRound = new Map<number, TournamentMatch[]>();
    matches.forEach((m) => byRound.set(m.round, [...(byRound.get(m.round) ?? []), m]));
    return [...byRound.entries()].sort((a, b) => b[0] - a[0]);
  }, [matches]);

  const latestRound = rounds[0]?.[0] ?? 0;
  const pending = matches.filter((m) => m.status === 'pending').sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);
  const latestMatches = rounds[0]?.[1] ?? [];
  // Older sessions created every round up front: only the earliest unplayed round is on court
  const currentRound = pending.length ? Math.min(...pending.map((m) => m.round)) : null;
  const onCourt = pending.filter((m) => m.round === currentRound);
  const upNext = pending.filter((m) => m.round !== currentRound);
  const playingNow = new Set(onCourt.flatMap((m) => teams(m).flat()));
  const sittingOut = tournament.playerIds.filter((id) => !playingNow.has(id));
  const completedRounds = rounds.filter(([, ms]) => ms.every((m) => m.status === 'completed'));

  const refresh = () =>
    Promise.all([
      refreshTournament(tournament.id),
      queryClient.invalidateQueries({ queryKey: ['players'] }),
      queryClient.invalidateQueries({ queryKey: ['games'] }),
      queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
    ]);

  const run = async (key: string, fn: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    try {
      await fn();
      await refresh();
      if (success) toast({ title: success });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Something went wrong', description: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const nextRound = () => run('next', () => addQuickPlayRound(tournament.id));

  const saveScore = async (s1: number, s2: number) => {
    if (!scoring) return;
    try {
      await recordTournamentMatchResult(await getIdToken(), {
        matchId: scoring.id,
        tournamentId: tournament.id,
        team1Score: s1,
        team2Score: s2,
      });
      await refresh();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save score', description: (error as Error).message });
      throw error;
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/tournaments" aria-label="Back to sessions" className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate">{tournament.name}</h1>
        {canRun && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Session options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!ended && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setPlayersDraft(tournament.playerIds);
                      setPlayersOpen(true);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" /> Change players
                  </DropdownMenuItem>
                  {latestRound > 0 && latestMatches.every((m) => m.status !== 'completed') && (
                    <DropdownMenuItem
                      onClick={() => run('delround', () => deleteQuickPlayRound(tournament.id, latestRound), `Round ${latestRound} removed`)}
                    >
                      <Shuffle className="h-4 w-4 mr-2" /> Redo round {latestRound}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setConfirmEnd(true)}>
                    <Flag className="h-4 w-4 mr-2" /> End session
                  </DropdownMenuItem>
                </>
              )}
              {isAdmin() && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete session
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
        <Badge variant={ended || stale ? 'secondary' : 'default'}>{ended ? 'Finished' : stale ? 'Inactive' : 'Live'}</Badge>
        <span>{tournament.format}</span>
        <span>·</span>
        <span>{tournament.playerIds.length} players</span>
        {!ended && !stale && canRun && (
          <span className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              aria-label="Fewer courts"
              className="h-7 w-7 rounded border flex items-center justify-center disabled:opacity-40"
              disabled={(tournament.availableCourts ?? 2) <= 1 || !!busy}
              onClick={() => run('courts', () => setSessionCourts(tournament.id, (tournament.availableCourts ?? 2) - 1))}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-foreground font-medium w-16 text-center">{tournament.availableCourts ?? 2} courts</span>
            <button
              type="button"
              aria-label="More courts"
              className="h-7 w-7 rounded border flex items-center justify-center"
              disabled={!!busy}
              onClick={() => run('courts', () => setSessionCourts(tournament.id, (tournament.availableCourts ?? 2) + 1))}
            >
              <Plus className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>

      {/* Never ended and idle for a day */}
      {!ended && stale && (
        <div className="rounded-xl border p-4 mb-5 text-sm">
          <p className="mb-3">This session was never ended. Its recorded results are kept either way.</p>
          {canRun && (
            <Button variant="outline" onClick={() => setConfirmEnd(true)}>
              <Flag className="h-4 w-4 mr-1" /> End it now
            </Button>
          )}
        </div>
      )}

      {/* On court */}
      {!ended && !stale && (
        <section className="mb-5">
          <h2 className="text-sm font-semibold mb-2">
            {onCourt.length ? `On court now · Round ${currentRound}` : 'Ready for the next round'}
          </h2>
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground mb-2">All matches have scores. Start the next round when everyone&apos;s ready.</p>
          )}
          <div className="space-y-2">
            {onCourt.map((m) => {
              const [t1, t2] = teams(m);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!canRun}
                  onClick={() => setScoring(m)}
                  className="w-full text-left rounded-xl border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Court {m.court ?? m.matchNumber}</span>
                    {canRun && <span className="text-primary font-medium">Tap to enter score</span>}
                  </div>
                  <div className="font-medium">{label(t1)}</div>
                  <div className="text-xs text-muted-foreground my-0.5">vs</div>
                  <div className="font-medium">{label(t2)}</div>
                </button>
              );
            })}
          </div>

          {upNext.length > 0 && (
            <Collapsible className="mt-3 rounded-xl border">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 text-sm font-medium">
                Up next ({upNext.length} matches already drawn) <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3 space-y-1 text-sm">
                {upNext.map((m) => (
                  <div key={m.id} className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">R{m.round}</span>
                    <span className="truncate flex-1">
                      {label(teams(m)[0])} v {label(teams(m)[1])}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {sittingOut.length > 0 && onCourt.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3 flex items-start gap-1.5">
              <Coffee className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Sitting out: <span className="text-foreground">{label(sittingOut).replaceAll(' & ', ', ')}</span>
              </span>
            </p>
          )}
        </section>
      )}

      {/* Standings */}
      {standings.some((s) => s.gamesPlayed > 0) && (
        <Collapsible defaultOpen={ended} className="mb-3 rounded-xl border">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-3 font-semibold text-sm">
            Standings <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left font-normal px-3 pb-1">Player</th>
                  <th className="font-normal pb-1">W</th>
                  <th className="font-normal pb-1">L</th>
                  <th className="font-normal pb-1 pr-3 text-right">+/−</th>
                </tr>
              </thead>
              <tbody>
                {[...standings]
                  .sort((a, b) => b.wins - a.wins || b.pointsDifference - a.pointsDifference)
                  .map((s) => (
                    <tr key={s.playerId} className="border-t">
                      <td className="px-3 py-1.5">{names.get(s.playerId) ?? s.player?.name}</td>
                      <td className="text-center">{s.wins}</td>
                      <td className="text-center">{s.losses}</td>
                      <td className="text-right pr-3">{s.pointsDifference > 0 ? `+${s.pointsDifference}` : s.pointsDifference}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Results history */}
      {completedRounds.length > 0 && (
        <Collapsible className="mb-3 rounded-xl border">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-3 font-semibold text-sm">
            Results ({matches.filter((m) => m.status === 'completed').length}) <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3 space-y-3">
            {rounds.map(([round, ms]) => {
              const done = ms.filter((m) => m.status === 'completed');
              if (!done.length) return null;
              return (
                <div key={round}>
                  <div className="text-xs text-muted-foreground mb-1">Round {round}</div>
                  {done.map((m) => {
                    const [t1, t2] = teams(m);
                    const sc = m.gameId ? scores.get(m.gameId) : undefined;
                    return (
                      <Link
                        key={m.id}
                        href={m.gameId ? `/games/${m.gameId}` : '#'}
                        className="flex items-center justify-between gap-2 text-sm py-1"
                      >
                        <span className={cn('truncate', sc && sc.team1 > sc.team2 && 'font-semibold')}>{label(t1)}</span>
                        <span className="font-mono shrink-0">{sc ? `${sc.team1}–${sc.team2}` : '✓'}</span>
                        <span className={cn('truncate text-right', sc && sc.team2 > sc.team1 && 'font-semibold')}>{label(t2)}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Next round */}
      {!ended && !stale && canRun && upNext.length === 0 && (
        <div className="fixed inset-x-0 bottom-20 md:bottom-0 px-3 py-2 z-30 bg-background/95 backdrop-blur border-t md:border-0 md:bg-transparent">
          <div className="max-w-xl mx-auto">
            <Button className="w-full h-12 text-base shadow-lg" onClick={nextRound} disabled={!!busy}>
              {busy === 'next' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : onCourt.length ? (
                `Start round ${latestRound + 1} (${onCourt.length} still playing)`
              ) : (
                `Start round ${latestRound + 1}`
              )}
            </Button>
          </div>
        </div>
      )}

      {scoring && (
        <ScoreEntrySheet
          open={!!scoring}
          onOpenChange={(o) => !o && setScoring(null)}
          title={`Court ${scoring.court ?? scoring.matchNumber}`}
          team1Label={label(teams(scoring)[0])}
          team2Label={label(teams(scoring)[1])}
          onSave={saveScore}
        />
      )}

      <PlayerPickerSheet
        open={playersOpen}
        onOpenChange={(open) => {
          setPlayersOpen(open);
          const changed =
            playersDraft.length !== tournament.playerIds.length ||
            playersDraft.some((id) => !tournament.playerIds.includes(id));
          if (!open && changed) run('players', () => setSessionPlayers(tournament.id, playersDraft), 'Players updated');
        }}
        mode="multiple"
        players={allPlayers}
        selectedIds={playersDraft}
        onChange={setPlayersDraft}
        title="Who's in this session?"
        description="Changes apply from the next round."
      />

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this session?</AlertDialogTitle>
            <AlertDialogDescription>
              Matches without a score are removed. Recorded results stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep playing</AlertDialogCancel>
            <AlertDialogAction onClick={() => run('end', () => endSession(tournament.id), 'Session ended')}>
              End session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              All its games are deleted and everyone&apos;s ratings are recalculated as if they never happened. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() =>
                run('delete', async () => {
                  await deleteTournament(await getIdToken(), tournament.id);
                  router.push('/tournaments');
                })
              }
            >
              Delete session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
