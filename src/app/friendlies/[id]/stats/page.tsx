'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotFoundMessage } from '@/components/not-found-message';
import { useToast } from '@/hooks/use-toast';
import { usePlayers } from '@/hooks/use-players';
import { useFriendly } from '@/hooks/use-friendlies';
import { computeFriendlyStats, type PlayerLine, type FriendlySide } from '@/lib/friendlies/stats';
import { shortNames } from '@/lib/player-names';
import { CLUB_ID, CLUB_NAME } from '@/config/club';
import { cn } from '@/lib/utils';
import type { FriendlyMatch } from '@/lib/types';

const CATEGORY_LABEL: Record<FriendlyMatch['category'], string> = {
  mens: "Men's",
  womens: "Women's",
  mixed: 'Mixed',
  open: 'Open',
};

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

type SortKey = 'winPct' | 'played' | 'diff' | 'avgMargin';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <div className="text-2xl font-bold font-mono">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function FriendlyStatsPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const { data: friendly, isLoading } = useFriendly(params.id);
  const { data: players = [] } = usePlayers(CLUB_ID);
  const [sort, setSort] = useState<SortKey>('winPct');

  const stats = useMemo(() => (friendly ? computeFriendlyStats(friendly) : null), [friendly]);
  const homeNames = useMemo(() => shortNames(players), [players]);
  const guestNames = useMemo(() => new Map((friendly?.guests ?? []).map((g) => [g.id, g.name])), [friendly]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!friendly || !stats) return <NotFoundMessage what="Friendly" backHref="/friendlies" backLabel="Back to friendlies" />;

  const nameOf = (side: FriendlySide, id: string) =>
    side === 'home' ? homeNames.get(id) ?? players.find((p) => p.id === id)?.name ?? '?' : guestNames.get(id) ?? '?';
  const pair = (side: FriendlySide, ids: string[]) => ids.map((id) => nameOf(side, id)).join(' & ');
  const dateLabel = new Date(friendly.date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const { team } = stats;

  const sortPlayers = (side: FriendlySide) =>
    stats.players
      .filter((p) => p.side === side)
      .sort((a, b) => (b[sort] as number) - (a[sort] as number) || b.winPct - a.winPct || b.diff - a.diff);

  const textSummary = () => {
    const lines = [
      `${CLUB_NAME} ${team.wins}–${team.losses} ${friendly.opponentName} · ${dateLabel}`,
      `Points ${team.pointsFor}–${team.pointsAgainst} (${signed(team.diff)}), ${team.winPct}% of matches won`,
      '',
      ...stats.byCategory.map(
        (c) => `${CATEGORY_LABEL[c.category]}: ${c.home.wins}–${c.home.losses} (points ${c.home.pointsFor}–${c.home.pointsAgainst})`
      ),
      '',
      `Our players (W–L, +/−):`,
      ...sortPlayers('home')
        .filter((p) => p.played)
        .map((p) => `${nameOf('home', p.id)} ${p.wins}–${p.losses} ${signed(p.diff)}`),
    ];
    return lines.join('\n');
  };

  const share = async () => {
    const url = window.location.href;
    const title = `${CLUB_NAME} v ${friendly.opponentName}: stats`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${CLUB_NAME} ${team.wins}–${team.losses} ${friendly.opponentName}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Members can open it after signing in.' });
    } catch {
      /* share sheet dismissed */
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(textSummary());
      toast({ title: 'Summary copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: 'Your browser blocked the clipboard.' });
    }
  };

  const PlayerTable = ({ side }: { side: FriendlySide }) => {
    const rows = sortPlayers(side);
    const header = (key: SortKey, label: string) => (
      <th className="font-normal text-right px-1.5 py-1">
        <button
          type="button"
          onClick={() => setSort(key)}
          className={cn('underline-offset-4', sort === key ? 'text-foreground font-semibold underline' : 'hover:underline')}
        >
          {label}
        </button>
      </th>
    );
    return (
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground bg-muted/40">
            <tr>
              <th className="text-left font-normal px-3 py-1">Player</th>
              {header('played', 'P')}
              <th className="font-normal text-right px-1.5 py-1">W–L</th>
              {header('winPct', 'Win%')}
              <th className="font-normal text-right px-1.5 py-1">Pts</th>
              {header('diff', '+/−')}
              {header('avgMargin', 'Avg')}
            </tr>
          </thead>
          <tbody>
            {rows.map((p: PlayerLine) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-1.5">
                  <div className="font-medium whitespace-nowrap">{nameOf(side, p.id)}</div>
                  {p.bestPartner && (
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      Best with {nameOf(side, p.bestPartner.id)} ({p.bestPartner.wins}/{p.bestPartner.played})
                    </div>
                  )}
                </td>
                <td className="text-right px-1.5">{p.played}</td>
                <td className="text-right px-1.5 whitespace-nowrap">
                  {p.wins}–{p.losses}
                  {p.draws ? `–${p.draws}` : ''}
                </td>
                <td className="text-right px-1.5">{p.played ? `${p.winPct}%` : '–'}</td>
                <td className="text-right px-1.5 whitespace-nowrap">
                  {p.pointsFor}–{p.pointsAgainst}
                </td>
                <td className={cn('text-right px-1.5', p.diff > 0 && 'text-green-600', p.diff < 0 && 'text-red-600')}>
                  {signed(p.diff)}
                </td>
                <td className="text-right px-1.5 pr-3">{p.played ? signed(p.avgMargin) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto pb-10 space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/friendlies/${friendly.id}`} aria-label="Back to the friendly" className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate">Stats: {CLUB_NAME} v {friendly.opponentName}</h1>
      </div>

      {/* Result */}
      <div className="rounded-xl border p-4 text-center">
        <div className="text-sm text-muted-foreground mb-1">
          {dateLabel}
          {friendly.venue ? ` · ${friendly.venue}` : ''}
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 text-right font-semibold truncate">{CLUB_NAME}</div>
          <div className="text-4xl font-bold font-mono">
            {team.wins}–{team.losses}
          </div>
          <div className="flex-1 text-left font-semibold truncate">{friendly.opponentName}</div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Matches won{team.draws ? ` · ${team.draws} drawn` : ''} · {team.played} of {friendly.matches.length} played
        </div>
        <div className="flex gap-2 justify-center mt-3">
          <Button size="sm" onClick={share}>
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
          <Button size="sm" variant="outline" onClick={copyText}>
            <Copy className="h-4 w-4 mr-1" /> Copy as text
          </Button>
        </div>
      </div>

      {team.played === 0 ? (
        <p className="text-center text-muted-foreground">No scores entered yet.</p>
      ) : (
        <>
          <Section title="Team">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Matches won" value={`${team.winPct}%`} sub={`${team.wins} of ${team.played}`} />
              <Stat label="Points" value={`${team.pointsFor}–${team.pointsAgainst}`} />
              <Stat label="Point difference" value={signed(team.diff)} sub={`${signed(Math.round((team.diff / team.played) * 10) / 10)} per match`} />
              <Stat label="Close matches" value={String(team.closeMatches)} sub="decided by 2 or less" />
            </div>
          </Section>

          {stats.byCategory.length > 0 && (
            <Section title="By match type">
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground bg-muted/40">
                    <tr>
                      <th className="text-left font-normal px-3 py-1">Type</th>
                      <th className="font-normal text-right px-2">W–L</th>
                      <th className="font-normal text-right px-2">Win%</th>
                      <th className="font-normal text-right px-3">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byCategory.map((c) => (
                      <tr key={c.category} className="border-t">
                        <td className="px-3 py-1.5">{CATEGORY_LABEL[c.category]}</td>
                        <td className="text-right px-2">
                          {c.home.wins}–{c.home.losses}
                        </td>
                        <td className="text-right px-2">{Math.round((c.home.wins / c.home.played) * 100)}%</td>
                        <td className="text-right px-3">
                          {c.home.pointsFor}–{c.home.pointsAgainst}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          <Section title="Round by round">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {stats.byRound.map((r) => (
                <div key={r.round} className="rounded-lg border px-3 py-2 text-center shrink-0 min-w-[72px]">
                  <div className="text-xs text-muted-foreground">R{r.round}</div>
                  <div
                    className={cn(
                      'font-mono font-semibold',
                      r.homeWins > r.awayWins && 'text-green-600',
                      r.awayWins > r.homeWins && 'text-red-600'
                    )}
                  >
                    {r.homeWins}–{r.awayWins}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.homePoints}–{r.awayPoints}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Highlights">
            <ul className="rounded-xl border divide-y text-sm">
              {stats.biggestHomeWin && (
                <li className="p-3">
                  <div className="text-xs text-muted-foreground">Our biggest win</div>
                  {pair('home', stats.biggestHomeWin.match.home)} beat {pair('away', stats.biggestHomeWin.match.away)}{' '}
                  {stats.biggestHomeWin.match.homeScore}–{stats.biggestHomeWin.match.awayScore}
                </li>
              )}
              {stats.biggestAwayWin && (
                <li className="p-3">
                  <div className="text-xs text-muted-foreground">Their biggest win</div>
                  {pair('away', stats.biggestAwayWin.match.away)} beat {pair('home', stats.biggestAwayWin.match.home)}{' '}
                  {stats.biggestAwayWin.match.awayScore}–{stats.biggestAwayWin.match.homeScore}
                </li>
              )}
              {stats.closest && (
                <li className="p-3">
                  <div className="text-xs text-muted-foreground">Closest match</div>
                  {pair('home', stats.closest.match.home)} {stats.closest.match.homeScore}–{stats.closest.match.awayScore}{' '}
                  {pair('away', stats.closest.match.away)}
                </li>
              )}
            </ul>
          </Section>

          <Section title={`Our players (${CLUB_NAME})`}>
            <p className="text-xs text-muted-foreground -mt-1">Tap a column to sort. Avg = average winning margin per match.</p>
            <PlayerTable side="home" />
          </Section>

          {stats.partnerships.some((p) => p.side === 'home') && (
            <Section title="Our partnerships">
              <ul className="rounded-xl border divide-y text-sm">
                {stats.partnerships
                  .filter((p) => p.side === 'home')
                  .map((p) => (
                    <li key={p.ids.join()} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate">{pair('home', p.ids)}</span>
                      <span className="shrink-0 font-mono">
                        {p.wins}–{p.losses}{' '}
                        <span className={cn('text-xs', p.diff > 0 && 'text-green-600', p.diff < 0 && 'text-red-600')}>
                          {signed(p.diff)}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </Section>
          )}

          <Section title={`Their players (${friendly.opponentName})`}>
            <PlayerTable side="away" />
          </Section>

          <Section title="All results">
            <ul className="rounded-xl border divide-y text-sm">
              {stats.completed.map((m) => {
                const homeWon = (m.homeScore ?? 0) > (m.awayScore ?? 0);
                const awayWon = (m.awayScore ?? 0) > (m.homeScore ?? 0);
                return (
                  <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground w-8 shrink-0">R{m.round}</span>
                    <span className={cn('flex-1 min-w-0 truncate', homeWon && 'font-semibold')}>{pair('home', m.home)}</span>
                    <span className="font-mono shrink-0">
                      {m.homeScore}–{m.awayScore}
                    </span>
                    <span className={cn('flex-1 min-w-0 truncate text-right', awayWon && 'font-semibold')}>
                      {pair('away', m.away)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}
