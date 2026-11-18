'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  CalendarDays,
  ChevronRight,
  Handshake,
  PlusSquare,
  Radio,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaddleIcon } from '@/components/icons/paddle-icon';
import { useAuth } from '@/contexts/auth-context';
import { usePlayers } from '@/hooks/use-players';
import { useRecentGames } from '@/hooks/use-games';
import { useFriendlies } from '@/hooks/use-friendlies';
import { getTournamentsByStatus } from '@/lib/data';
import { isSessionStale } from '@/app/tournaments/quick-play-actions';
import { tallyFriendly } from '@/lib/friendlies';
import { shortNames } from '@/lib/player-names';
import { CLUB_ID, CLUB_NAME } from '@/config/club';
import { cn } from '@/lib/utils';

const MORE_LINKS: { title: string; href: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
  { title: 'Players', href: '/players', icon: Users },
  { title: 'Games', href: '/games', icon: PaddleIcon },
  { title: 'Stats', href: '/statistics', icon: BarChart },
  { title: 'Sessions', href: '/tournaments', icon: Trophy },
  { title: 'Friendlies', href: '/friendlies', icon: Handshake },
  { title: 'Events', href: '/events', icon: CalendarDays, adminOnly: true },
];

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Home() {
  const { user, isAdmin, canCreateTournaments } = useAuth();
  const { data: players = [] } = usePlayers(CLUB_ID);
  const { data: recent = [] } = useRecentGames(5, CLUB_ID);
  const { data: friendlies = [] } = useFriendlies();
  const { data: activeSessions = [] } = useQuery({
    queryKey: ['tournaments', 'active', CLUB_ID],
    queryFn: () => getTournamentsByStatus('active', CLUB_ID),
    staleTime: 15 * 1000,
  });

  const names = useMemo(() => shortNames(players), [players]);
  const liveSessions = activeSessions.filter((t) => t.isQuickPlay && !isSessionStale(t));
  const liveFriendlies = friendlies.filter((f) => f.status === 'live');
  const canRun = canCreateTournaments();
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{CLUB_NAME}</p>
        <h1 className="text-2xl font-bold">{firstName ? `Hi ${firstName}` : 'Welcome'}</h1>
      </div>

      {/* Happening now */}
      {(liveSessions.length > 0 || liveFriendlies.length > 0) && (
        <section className="space-y-2">
          {liveSessions.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="flex items-center gap-3 rounded-xl border border-green-600/50 bg-green-600/10 p-3"
            >
              <Radio className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  Session live · {t.playerIds.length} players{t.currentRound ? ` · round ${t.currentRound}` : ''}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
          {liveFriendlies.map((f) => {
            const tally = tallyFriendly(f);
            return (
              <Link
                key={f.id}
                href={`/friendlies/${f.id}`}
                className="flex items-center gap-3 rounded-xl border border-purple-600/50 bg-purple-600/10 p-3"
              >
                <Handshake className="h-5 w-5 text-purple-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">vs {f.opponentName}</div>
                  <div className="text-xs text-muted-foreground">
                    Friendly live · {tally.homeMatches}–{tally.awayMatches} · {tally.played}/{f.matches.length} played
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            );
          })}
        </section>
      )}

      {/* Main actions */}
      {canRun && (
        <section className="grid grid-cols-3 gap-2">
          <Link href="/log-game">
            <Button className="w-full h-20 flex-col gap-1 text-sm">
              <PlusSquare className="h-6 w-6" /> Log game
            </Button>
          </Link>
          <Link href="/tournaments/quick-play">
            <Button variant="outline" className="w-full h-20 flex-col gap-1 text-sm">
              <Zap className="h-6 w-6 text-green-600" /> Start session
            </Button>
          </Link>
          <Link href="/friendlies/new">
            <Button variant="outline" className="w-full h-20 flex-col gap-1 text-sm">
              <Handshake className="h-6 w-6 text-purple-600" /> Friendly
            </Button>
          </Link>
        </section>
      )}

      {/* Recent results */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Latest results</h2>
          <Link href="/games" className="text-sm text-primary">
            All games
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No games yet.</p>
        ) : (
          <ul className="rounded-xl border divide-y">
            {recent.map((g) => {
              const t1 = g.team1.playerIds.map((id) => names.get(id) ?? '?').join(' & ');
              const t2 = g.team2.playerIds.map((id) => names.get(id) ?? '?').join(' & ');
              const t1Won = g.team1.score > g.team2.score;
              const t2Won = g.team2.score > g.team1.score;
              return (
                <li key={g.id}>
                  <Link href={`/games/${g.id}`} className="flex items-center gap-2 p-3 text-sm hover:bg-accent/50">
                    <span className={cn('flex-1 min-w-0 truncate', t1Won && 'font-semibold')}>{t1}</span>
                    <span className="font-mono shrink-0">
                      {g.team1.score}–{g.team2.score}
                    </span>
                    <span className={cn('flex-1 min-w-0 truncate text-right', t2Won && 'font-semibold')}>{t2}</span>
                    <span className="text-xs text-muted-foreground w-14 text-right shrink-0">{timeAgo(g.date)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Everything else */}
      <section className="grid grid-cols-3 gap-2">
        {MORE_LINKS.filter((l) => !l.adminOnly || isAdmin()).map(({ title, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border p-3 hover:bg-accent text-sm"
          >
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </Link>
        ))}
      </section>
    </div>
  );
}
