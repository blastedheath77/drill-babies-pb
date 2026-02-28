'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Calendar, Users, Trophy, Plus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useClub } from '@/contexts/club-context';
import { getLeagueGamesByClub } from './actions';
import type { LeagueGame } from '@/lib/types';

export function LeagueGamesClient() {
  const { canCreateTournaments } = useAuth();
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const [leagueGames, setLeagueGames] = useState<LeagueGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeagueGames = useCallback(async () => {
    if (!selectedClub?.id) {
      setLeagueGames([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const games = await getLeagueGamesByClub(selectedClub.id);
      setLeagueGames(games);
    } catch (err) {
      setError('Failed to load league games');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClub?.id]);

  useEffect(() => {
    if (!clubsLoading) {
      loadLeagueGames();
    }
  }, [clubsLoading, loadLeagueGames]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const getStatusBadge = (status: LeagueGame['status']) => {
    if (status === 'submitted') {
      return (
        <Badge variant="default" className="bg-green-600 text-white">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Submitted
        </Badge>
      );
    }
    return <Badge variant="secondary">Active</Badge>;
  };

  const getCompletedCount = (game: LeagueGame) =>
    (Array.isArray(game.matches) ? game.matches : []).filter((m) => m.status === 'completed').length;

  if (!clubsLoading && !hasAnyClubs) {
    return (
      <>
        <PageHeader title="League Games" description="PBS league fixture results." />
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-10">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              You are not assigned to any clubs yet. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="League Games" description="PBS league fixture results." />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading fixtures...</span>
          </CardContent>
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="League Games" description="PBS league fixture results." />
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <AlertCircle className="h-8 w-8 text-destructive mr-2" />
            <span>{error}</span>
          </CardContent>
        </Card>
      </>
    );
  }

  const activeGames = leagueGames.filter((g) => g.status === 'active');
  const submittedGames = leagueGames.filter((g) => g.status === 'submitted');

  return (
    <>
      <PageHeader
        title={`${selectedClub?.name ?? ''} League Games`}
        description="PBS league fixture results and DUPR submission."
      />

      {canCreateTournaments() && (
        <div className="flex justify-center mb-6">
          <Link href="/league-games/create">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white w-44">
              <Plus className="h-4 w-4 mr-2" />
              New Fixture
            </Button>
          </Link>
        </div>
      )}

      {leagueGames.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center text-center gap-4 py-16">
            <Trophy className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">No League Fixtures</p>
              <p className="text-muted-foreground">
                Create your first PBS league fixture to get started.
              </p>
            </div>
            {canCreateTournaments() && (
              <Link href="/league-games/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Fixture
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {activeGames.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Active ({activeGames.length})</h2>
              <div className="grid gap-4">
                {activeGames.map((game) => (
                  <FixtureCard key={game.id} game={game} formatDate={formatDate} getStatusBadge={getStatusBadge} getCompletedCount={getCompletedCount} />
                ))}
              </div>
            </section>
          )}

          {submittedGames.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Submitted ({submittedGames.length})</h2>
              <div className="grid gap-4">
                {submittedGames.map((game) => (
                  <FixtureCard key={game.id} game={game} formatDate={formatDate} getStatusBadge={getStatusBadge} getCompletedCount={getCompletedCount} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function FixtureCard({
  game,
  formatDate,
  getStatusBadge,
  getCompletedCount,
}: {
  game: LeagueGame;
  formatDate: (d: string) => string;
  getStatusBadge: (s: LeagueGame['status']) => React.ReactNode;
  getCompletedCount: (g: LeagueGame) => number;
}) {
  const completed = getCompletedCount(game);
  const total = (Array.isArray(game.matches) ? game.matches : []).length;

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
      <Link href={`/league-games/${game.id}`} className="block">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight flex items-center gap-2 truncate">
                <Trophy className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span className="truncate">{game.name}</span>
              </CardTitle>
            </div>
            <div className="flex-shrink-0">{getStatusBadge(game.status)}</div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(game.date)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {game.clubPlayerIds.length} players
            </span>
            <Badge
              variant={completed === total ? 'default' : 'outline'}
              className={`text-xs px-1.5 py-0.5 ${completed === total ? 'bg-green-600 text-white' : ''}`}
            >
              {completed}/{total} scored
            </Badge>
          </div>
          {game.venue && (
            <p className="text-xs text-muted-foreground mt-1">{game.venue}</p>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
