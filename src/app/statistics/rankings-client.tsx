'use client';

import { useMemo } from 'react';
import { usePlayers } from '@/hooks/use-players';
import { useCircles } from '@/hooks/use-circles';
import { useAllGames } from '@/hooks/use-games';
import { useClub } from '@/contexts/club-context';
import { SortableStatisticsTable } from '@/components/sortable-statistics-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users } from 'lucide-react';
import type { Player, Game } from '@/lib/types';
import { calculatePlayerForm } from '@/lib/data';

export type DateFilter = 'all' | '2weeks' | '1month' | '2months' | 'custom';

interface RankingsClientProps {
  initialPlayers: Player[];
  selectedCircleId: string | null;
  dateFilter: DateFilter;
  customStartDate: string;
  customEndDate: string;
}

export function RankingsClient({
  initialPlayers,
  selectedCircleId,
  dateFilter,
  customStartDate,
  customEndDate,
}: RankingsClientProps) {
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { data: players, isLoading, error, isError } = usePlayers(selectedClub?.id);
  const { data: circles } = useCircles(selectedClub?.id);
  const { data: games } = useAllGames(selectedClub?.id);


  // Use React Query data if available, otherwise fall back to initial data
  const allPlayersData = players || initialPlayers;

  // Calculate date range for filtering
  const dateRange = useMemo(() => {
    if (dateFilter === 'all') return { start: null, end: null };

    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today

    if (dateFilter === '2weeks') {
      const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    } else if (dateFilter === '1month') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    } else if (dateFilter === '2months') {
      const start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    } else if (dateFilter === 'custom') {
      const start = customStartDate ? new Date(customStartDate) : null;
      const end = customEndDate ? new Date(customEndDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    return { start: null, end: null };
  }, [dateFilter, customStartDate, customEndDate]);

  // Recalculate player statistics based on date-filtered games
  // Only recalculates: wins, losses, pointsFor, pointsAgainst
  // Rating is kept as-is (too complex to recalculate for a period)
  // Also calculates form metric for each player
  const filteredPlayersData = useMemo(() => {
    // If no date filter or no games data available, use original player data with form
    if (dateFilter === 'all' || !games) {
      return allPlayersData.map(player => ({
        ...player,
        form: calculatePlayerForm(player.id, games || [], player.rating)
      }));
    }

    if (games.length === 0) {
      return allPlayersData.map(player => ({
        ...player,
        form: calculatePlayerForm(player.id, [], player.rating)
      }));
    }

    // Filter games by date range
    const filteredGames = games.filter(game => {
      const gameDate = new Date(game.date);

      // Check start date
      if (dateRange.start && gameDate < dateRange.start) {
        return false;
      }
      // Check end date
      if (dateRange.end && gameDate > dateRange.end) {
        return false;
      }
      return true;
    });

    // If no games in the filtered period, return players with zeroed stats
    if (filteredGames.length === 0) {
      return allPlayersData.map(player => ({
        ...player,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        form: calculatePlayerForm(player.id, [], player.rating)
      }));
    }

    // Recalculate stats for each player
    const playerStatsMap = new Map<string, {
      wins: number;
      losses: number;
      draws: number;
      pointsFor: number;
      pointsAgainst: number;
    }>();

    filteredGames.forEach(game => {
      const { team1, team2 } = game;

      // Skip games without team data
      if (!team1 || !team2) return;

      const team1Score = team1.score || 0;
      const team2Score = team2.score || 0;
      const isDraw = team1Score === team2Score;
      const team1Won = team1Score > team2Score;

      // Process team1 players
      if (team1.playerIds && Array.isArray(team1.playerIds)) {
        team1.playerIds.forEach(playerId => {
          const stats = playerStatsMap.get(playerId) || {
            wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0
          };

          if (isDraw) {
            stats.draws++;
          } else if (team1Won) {
            stats.wins++;
          } else {
            stats.losses++;
          }
          stats.pointsFor += team1Score;
          stats.pointsAgainst += team2Score;

          playerStatsMap.set(playerId, stats);
        });
      }

      // Process team2 players
      if (team2.playerIds && Array.isArray(team2.playerIds)) {
        team2.playerIds.forEach(playerId => {
          const stats = playerStatsMap.get(playerId) || {
            wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0
          };

          if (isDraw) {
            stats.draws++;
          } else if (!team1Won) {
            stats.wins++;
          } else {
            stats.losses++;
          }
          stats.pointsFor += team2Score;
          stats.pointsAgainst += team1Score;

          playerStatsMap.set(playerId, stats);
        });
      }
    });

    // Update player objects with recalculated stats and form
    return allPlayersData.map(player => {
      const stats = playerStatsMap.get(player.id);
      // Always use ALL games for form calculation (not filtered by date)
      const form = calculatePlayerForm(player.id, games || [], player.rating);

      if (!stats) {
        // Player has no games in this period
        return { ...player, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0, form };
      }
      return {
        ...player,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        pointsFor: stats.pointsFor,
        pointsAgainst: stats.pointsAgainst,
        form
      };
    });
  }, [allPlayersData, games, dateFilter, dateRange]);

  // Filter out players with 5 or fewer games for rankings (minimum threshold for meaningful stats)
  const MIN_GAMES_THRESHOLD = 5;
  const activePlayersData = filteredPlayersData.filter(player => (player.wins + player.losses + player.draws) > MIN_GAMES_THRESHOLD);
  const minGamesExcludedCount = filteredPlayersData.filter(player => {
    const totalGames = player.wins + player.losses + player.draws;
    return totalGames > 0 && totalGames <= MIN_GAMES_THRESHOLD;
  }).length;

  // Filter out players excluded from rankings by admin
  const rankablePlayersData = activePlayersData.filter(player => !player.excludeFromRankings);
  const adminExcludedCount = activePlayersData.filter(player => !!player.excludeFromRankings).length;

  // Apply circle filtering
  const playersData = useMemo(() => {
    if (!selectedCircleId || !circles) {
      return rankablePlayersData;
    }

    const selectedCircle = circles.find(c => c.id === selectedCircleId);
    if (!selectedCircle) {
      return rankablePlayersData;
    }

    // Filter players to only include those in the selected circle
    return rankablePlayersData.filter(player =>
      selectedCircle.playerIds.includes(player.id)
    );
  }, [rankablePlayersData, selectedCircleId, circles]);

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Users className="h-6 w-6" />
              No Club Access
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You are not assigned to any clubs yet. Please contact an administrator to get access to a club.
            </p>
            <p className="text-sm text-muted-foreground">
              Once you have club access, you'll be able to view player statistics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load player statistics. {error?.message || 'Please try refreshing the page.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading && !playersData.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-80" />
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (playersData.length === 0) {
    const isFiltered = selectedCircleId !== null;
    const selectedCircleName = selectedCircleId && circles
      ? circles.find(c => c.id === selectedCircleId)?.name
      : null;

    return (
      <div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isFiltered ? 'No Players in Circle' : 'No Player Statistics'}
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {isFiltered && selectedCircleName
                ? `No active players found in the "${selectedCircleName}" circle. Try selecting a different circle or ensure players have played games.`
                : 'No players have played any games yet. Player rankings will appear here once games are logged.'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get circle name for display
  const selectedCircleName = selectedCircleId && circles
    ? circles.find(c => c.id === selectedCircleId)?.name
    : null;

  return (
    <div className="space-y-6">
      {/* Player Count */}
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          {selectedCircleName
            ? `Showing results for "${selectedCircleName}" circle`
            : 'Showing all active players'
          }
        </p>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {playersData.length} Player{playersData.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Statistics Table */}
      <SortableStatisticsTable
        players={playersData}
        showRating={dateFilter === 'all'}
        initialSortField={dateFilter === 'all' ? 'rating' : 'winPercentage'}
      />

      {/* Excluded Players Notice */}
      {(minGamesExcludedCount > 0 || adminExcludedCount > 0) && (
        <Alert>
          <AlertDescription>
            <span className="font-medium">Note:</span> Some players are excluded from rankings:
            <div className="mt-1 space-y-1">
              {minGamesExcludedCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  • {minGamesExcludedCount} player{minGamesExcludedCount !== 1 ? 's' : ''} with ≤{MIN_GAMES_THRESHOLD} games in this period
                </div>
              )}
              {adminExcludedCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  • {adminExcludedCount} player{adminExcludedCount !== 1 ? 's' : ''} excluded by admin
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}