'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Copy,
  Flag,
  Loader2,
  Lock,
  MoreVertical,
  Play,
  Shuffle,
  Trash2,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { usePlayers } from '@/hooks/use-players';
import { useFriendly, useRefreshFriendlies } from '@/hooks/use-friendlies';
import { ScoreEntrySheet } from '@/components/courtside/score-entry-sheet';
import {
  deleteFriendly,
  planFriendly,
  playerGender,
  tallyFriendly,
  toFriendlyMatches,
  updateFriendly,
} from '@/lib/friendlies';
import { shortNames } from '@/lib/player-names';
import { CLUB_ID, CLUB_NAME } from '@/config/club';
import { cn } from '@/lib/utils';
import type { Friendly, FriendlyMatch } from '@/lib/types';

const CATEGORY_LABEL: Record<FriendlyMatch['category'], string> = {
  mens: "Men's",
  womens: "Women's",
  mixed: 'Mixed',
  open: 'Open',
};

type Side = 'home' | 'away';
interface SlotRef {
  matchId: string;
  side: Side;
  index: number;
}

export default function FriendlyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAdmin, canCreateTournaments } = useAuth();
  const { data: friendly, isLoading } = useFriendly(params.id);
  const refreshFriendlies = useRefreshFriendlies();
  const { data: players = [] } = usePlayers(CLUB_ID);

  const [matches, setMatches] = useState<FriendlyMatch[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<SlotRef | null>(null);
  const [scoring, setScoring] = useState<FriendlyMatch | null>(null);

  useEffect(() => {
    if (friendly) setMatches(friendly.matches);
  }, [friendly]);

  const homeNames = useMemo(() => shortNames(players), [players]);
  const guestById = useMemo(() => new Map((friendly?.guests ?? []).map((g) => [g.id, g])), [friendly]);
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!friendly) notFound();

  const f: Friendly = { ...friendly, matches };
  const canEdit = canCreateTournaments();
  const canDelete = isAdmin() || friendly.createdBy === user?.id;
  const draft = f.status === 'draft';
  const live = f.status === 'live';
  const tally = tallyFriendly(f);

  const nameOf = (side: Side, id: string) =>
    side === 'home' ? homeNames.get(id) ?? playerById.get(id)?.name ?? '?' : guestById.get(id)?.name ?? '?';
  const label = (side: Side, ids: string[]) => ids.map((id) => nameOf(side, id)).join(' & ');
  const genderOf = (side: Side, id: string) =>
    side === 'home' ? (playerById.get(id) ? playerGender(playerById.get(id)!) : undefined) : guestById.get(id)?.gender;

  const categoryFor = (m: FriendlyMatch): FriendlyMatch['category'] => {
    if (m.home.length < 2) return 'open';
    const g = m.home.map((id) => genderOf('home', id));
    if (g.includes(undefined)) return 'open';
    if (g.every((x) => x === 'M')) return 'mens';
    if (g.every((x) => x === 'F')) return 'womens';
    return 'mixed';
  };

  const persist = async (next: FriendlyMatch[], extra: Partial<Friendly> = {}) => {
    setMatches(next);
    try {
      await updateFriendly(f.id, { matches: next, ...extra });
      await refreshFriendlies();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save', description: (error as Error).message });
      setMatches(friendly.matches);
    }
  };

  // Fairness report from the current (possibly hand-edited) schedule
  const report = (() => {
    const count = new Map<string, number>();
    const partners = new Map<string, number>();
    const cats: Record<string, number> = {};
    for (const m of matches) {
      [...m.home, ...m.away].forEach((id) => count.set(id, (count.get(id) ?? 0) + 1));
      for (const side of [m.home, m.away]) {
        if (side.length === 2) {
          const k = [...side].sort().join('|');
          partners.set(k, (partners.get(k) ?? 0) + 1);
        }
      }
      cats[m.category] = (cats[m.category] ?? 0) + 1;
    }
    const range = (ids: string[]) => {
      const v = ids.map((id) => count.get(id) ?? 0);
      return v.length ? [Math.min(...v), Math.max(...v)] : [0, 0];
    };
    return {
      home: range(f.homePlayerIds),
      away: range(f.guests.map((g) => g.id)),
      repeats: [...partners.values()].reduce((s, v) => s + Math.max(0, v - 1), 0),
      cats,
      count,
    };
  })();

  const regenerate = async () => {
    setBusy('regen');
    try {
      const result = planFriendly({
        homePlayers: players.filter((p) => f.homePlayerIds.includes(p.id)),
        guests: f.guests,
        format: f.format,
        courts: f.courts,
        rounds: f.rounds,
        matchTypes: f.matchTypes,
        locked: matches.filter((m) => m.locked),
      });
      await persist(toFriendlyMatches(result, matches));
      result.warnings.forEach((w) => toast({ title: 'Heads up', description: w }));
    } finally {
      setBusy(null);
    }
  };

  const toggleLock = (m: FriendlyMatch) => persist(matches.map((x) => (x.id === m.id ? { ...x, locked: !x.locked } : x)));

  /** Put `newId` in a slot; if they're already playing that round on the same side, swap them. */
  const replaceSlot = (slot: SlotRef, newId: string) => {
    const target = matches.find((m) => m.id === slot.matchId)!;
    const oldId = target[slot.side][slot.index];
    const next = matches.map((m) => ({ ...m, home: [...m.home], away: [...m.away] }));
    const t = next.find((m) => m.id === slot.matchId)!;
    const other = next.find((m) => m.round === target.round && m[slot.side].includes(newId));
    if (other) other[slot.side][other[slot.side].indexOf(newId)] = oldId;
    t[slot.side][slot.index] = newId;
    persist(next.map((m) => ({ ...m, category: categoryFor(m) })));
    setReplacing(null);
  };

  const setStatus = async (status: Friendly['status']) => {
    setBusy(status);
    await persist(matches, { status });
    setBusy(null);
  };

  const saveScore = async (h: number, a: number) => {
    if (!scoring) return;
    await persist(
      matches.map((m) => (m.id === scoring.id ? { ...m, homeScore: h, awayScore: a, status: 'completed' } : m))
    );
  };

  const copySummary = async () => {
    const lines = [
      `${CLUB_NAME} ${tally.homeMatches}–${tally.awayMatches} ${f.opponentName} (points ${tally.homePoints}–${tally.awayPoints})`,
      '',
      ...matches
        .filter((m) => m.status === 'completed')
        .map((m) => `R${m.round} ${label('home', m.home)} ${m.homeScore}–${m.awayScore} ${label('away', m.away)}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast({ title: 'Summary copied', description: 'Paste it into your group chat.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: 'Your browser blocked the clipboard.' });
    }
  };

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const replacingMatch = replacing ? matches.find((m) => m.id === replacing.matchId) : null;

  return (
    <div className="max-w-xl mx-auto pb-28">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/friendlies" aria-label="Back to friendlies" className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate">vs {f.opponentName}</h1>
        {(canEdit || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Friendly options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {tally.played > 0 && (
                <DropdownMenuItem onClick={copySummary}>
                  <Copy className="h-4 w-4 mr-2" /> Copy summary
                </DropdownMenuItem>
              )}
              {live && canEdit && (
                <DropdownMenuItem onClick={() => setStatus('draft')}>
                  <Shuffle className="h-4 w-4 mr-2" /> Back to planning
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    if (!window.confirm('Delete this friendly and its results?')) return;
                    await deleteFriendly(f.id);
                    await refreshFriendlies();
                    router.push('/friendlies');
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
        <Badge variant={live ? 'default' : 'secondary'}>{draft ? 'Planning' : live ? 'Live' : 'Finished'}</Badge>
        <span>{new Date(f.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        {f.venue && <span>· {f.venue}</span>}
        <span>
          · {f.homePlayerIds.length} v {f.guests.length} · {f.courts} courts
        </span>
      </div>

      {/* Score */}
      {tally.played > 0 && (
        <div className="rounded-xl border p-4 mb-4 text-center">
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 text-right font-semibold truncate">{CLUB_NAME}</div>
            <div className="text-3xl font-bold font-mono">
              {tally.homeMatches}–{tally.awayMatches}
            </div>
            <div className="flex-1 text-left font-semibold truncate">{f.opponentName}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Matches won · points {tally.homePoints}–{tally.awayPoints} · {tally.played}/{matches.length} played
          </div>
        </div>
      )}

      {/* Fairness, while planning */}
      {draft && (
        <div className="rounded-xl border p-3 mb-4 text-sm space-y-1">
          <div className="font-semibold mb-1">How fair is it?</div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Games for each of our players</span>
            <span className={cn('font-medium', report.home[1] - report.home[0] > 1 && 'text-amber-600')}>
              {report.home[0] === report.home[1] ? report.home[0] : `${report.home[0]}–${report.home[1]}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Games for each visitor</span>
            <span className={cn('font-medium', report.away[1] - report.away[0] > 1 && 'text-amber-600')}>
              {report.away[0] === report.away[1] ? report.away[0] : `${report.away[0]}–${report.away[1]}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Repeated partnerships</span>
            <span className={cn('font-medium', report.repeats > 0 && 'text-amber-600')}>{report.repeats}</span>
          </div>
          {f.format === 'doubles' && f.matchTypes !== 'open' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Match types</span>
              <span className="font-medium">
                {(['mens', 'womens', 'mixed', 'open'] as const)
                  .filter((c) => report.cats[c])
                  .map((c) => `${report.cats[c]} ${CATEGORY_LABEL[c].toLowerCase()}`)
                  .join(', ')}
              </span>
            </div>
          )}
          {canEdit && (
            <p className="text-xs text-muted-foreground pt-1">
              Tap a name to swap someone in. Lock matches you like, then regenerate the rest.
            </p>
          )}
        </div>
      )}

      {/* Schedule */}
      <div className="space-y-4">
        {rounds.map((round) => {
          const inRound = matches.filter((m) => m.round === round).sort((a, b) => a.court - b.court);
          const playing = new Set(inRound.flatMap((m) => [...m.home, ...m.away]));
          const resting = [
            ...f.homePlayerIds.filter((id) => !playing.has(id)).map((id) => nameOf('home', id)),
            ...f.guests.filter((g) => !playing.has(g.id)).map((g) => g.name),
          ];
          return (
            <section key={round}>
              <h2 className="text-sm font-semibold mb-1.5">Round {round}</h2>
              <div className="space-y-2">
                {inRound.map((m) => {
                  const done = m.status === 'completed';
                  const homeWon = done && (m.homeScore ?? 0) > (m.awayScore ?? 0);
                  const awayWon = done && (m.awayScore ?? 0) > (m.homeScore ?? 0);
                  const nameButton = (side: Side, id: string, index: number) =>
                    draft && canEdit ? (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setReplacing({ matchId: m.id, side, index })}
                        className="underline decoration-dotted underline-offset-4 hover:text-primary"
                      >
                        {nameOf(side, id)}
                      </button>
                    ) : (
                      <span key={id}>{nameOf(side, id)}</span>
                    );
                  const team = (side: Side) => (
                    <span className="flex flex-wrap gap-x-1">
                      {m[side].map((id, i) => (
                        <span key={id} className="flex gap-x-1">
                          {i > 0 && <span className="text-muted-foreground">&</span>}
                          {nameButton(side, id, i)}
                        </span>
                      ))}
                    </span>
                  );
                  return (
                    <div
                      key={m.id}
                      role={live && canEdit ? 'button' : undefined}
                      tabIndex={live && canEdit ? 0 : undefined}
                      onClick={() => live && canEdit && setScoring(m)}
                      onKeyDown={(e) => e.key === 'Enter' && live && canEdit && setScoring(m)}
                      className={cn('rounded-xl border p-3', live && canEdit && 'cursor-pointer hover:bg-accent/50', m.locked && draft && 'border-primary/60')}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>
                          Court {m.court}
                          {f.format === 'doubles' && m.category !== 'open' && ` · ${CATEGORY_LABEL[m.category]}`}
                        </span>
                        {draft && canEdit && (
                          <button
                            type="button"
                            onClick={() => toggleLock(m)}
                            className={cn('flex items-center gap-1', m.locked ? 'text-primary' : '')}
                            aria-pressed={!!m.locked}
                          >
                            {m.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            {m.locked ? 'Locked' : 'Lock'}
                          </button>
                        )}
                        {live && !done && canEdit && <span className="text-primary font-medium">Tap to score</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn('flex-1 min-w-0', homeWon && 'font-semibold')}>{team('home')}</div>
                        <div className="font-mono text-lg shrink-0 w-14 text-center">
                          {done ? `${m.homeScore}–${m.awayScore}` : <span className="text-muted-foreground text-sm">v</span>}
                        </div>
                        <div className={cn('flex-1 min-w-0 text-right flex justify-end', awayWon && 'font-semibold')}>
                          {team('away')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {resting.length > 0 && <p className="text-xs text-muted-foreground mt-1">Resting: {resting.join(', ')}</p>}
            </section>
          );
        })}
      </div>

      {/* Actions */}
      {canEdit && f.status !== 'finished' && (
        <div className="fixed inset-x-0 bottom-20 md:bottom-0 px-3 py-2 z-30 bg-background/95 backdrop-blur border-t md:border-0 md:bg-transparent">
          <div className="max-w-xl mx-auto flex gap-2">
            {draft ? (
              <>
                <Button variant="outline" className="h-12 flex-1" onClick={regenerate} disabled={!!busy}>
                  {busy === 'regen' ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Shuffle className="h-4 w-4 mr-1" /> Regenerate</>}
                </Button>
                <Button className="h-12 flex-1 text-base" onClick={() => setStatus('live')} disabled={!!busy}>
                  <Play className="h-4 w-4 mr-1" /> Start
                </Button>
              </>
            ) : (
              <Button className="h-12 w-full text-base" onClick={() => setStatus('finished')} disabled={!!busy}>
                <Flag className="h-4 w-4 mr-1" /> Finish ({tally.played}/{matches.length} scored)
              </Button>
            )}
          </div>
        </div>
      )}
      {f.status === 'finished' && tally.played > 0 && (
        <Button variant="outline" className="w-full mt-4" onClick={copySummary}>
          <Copy className="h-4 w-4 mr-1" /> Copy summary for the group chat
        </Button>
      )}

      {/* Swap someone in */}
      <Sheet open={!!replacing} onOpenChange={(o) => !o && setReplacing(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          {replacing && replacingMatch && (
            <>
              <SheetHeader className="text-left mb-2">
                <SheetTitle>Swap {nameOf(replacing.side, replacingMatch[replacing.side][replacing.index])}</SheetTitle>
                <SheetDescription>Round {replacingMatch.round}, court {replacingMatch.court}. Pick who plays instead.</SheetDescription>
              </SheetHeader>
              <ul>
                {(replacing.side === 'home' ? f.homePlayerIds : f.guests.map((g) => g.id))
                  .filter((id) => !replacingMatch[replacing.side].includes(id))
                  .map((id) => {
                    const busyIn = matches.find((m) => m.round === replacingMatch.round && m[replacing.side].includes(id));
                    return { id, busyIn };
                  })
                  .sort((a, b) => Number(!!a.busyIn) - Number(!!b.busyIn) || (report.count.get(a.id) ?? 0) - (report.count.get(b.id) ?? 0))
                  .map(({ id, busyIn }) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => replaceSlot(replacing, id)}
                        className="w-full flex items-center justify-between h-12 px-2 rounded-lg hover:bg-accent text-left"
                      >
                        <span className="font-medium">{nameOf(replacing.side, id)}</span>
                        <span className="text-xs text-muted-foreground">
                          {busyIn ? `on court ${busyIn.court}: they swap` : 'resting this round'}{' '}
                          · {report.count.get(id) ?? 0} games
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </SheetContent>
      </Sheet>

      {scoring && (
        <ScoreEntrySheet
          open={!!scoring}
          onOpenChange={(o) => !o && setScoring(null)}
          title={`Round ${scoring.round}, court ${scoring.court}`}
          team1Label={`${label('home', scoring.home)} (${CLUB_NAME})`}
          team2Label={label('away', scoring.away)}
          initial={scoring.status === 'completed' ? [scoring.homeScore ?? 0, scoring.awayScore ?? 0] : undefined}
          onSave={saveScore}
        />
      )}

      {f.status === 'finished' && (
        <p className="text-xs text-muted-foreground text-center mt-6 flex items-center justify-center gap-1">
          <Check className="h-3.5 w-3.5" /> Friendly results count towards members&apos; friendlies record, not club ratings.
        </p>
      )}
    </div>
  );
}
