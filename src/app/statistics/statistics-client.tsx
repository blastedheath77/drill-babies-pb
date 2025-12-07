'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlayers } from '@/hooks/use-players';
import { useCircles } from '@/hooks/use-circles';
import { useAllGames } from '@/hooks/use-games';
import { useClub } from '@/contexts/club-context';
import { SortableStatisticsTable } from '@/components/sortable-statistics-table';
import { CircleSelector } from '@/components/circle-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Users, Filter, Calendar } from 'lucide-react';
import type { Player, Game } from '@/lib/types';
import { calculatePlayerForm } from '@/lib/data';

interface StatisticsClientProps {
  initialPlayers: Player[];
}

type DateFilter = 'all' | '2weeks' | '1month' | '2months' | 'custom';

export function StatisticsClient({ initialPlayers }: StatisticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { data: players, isLoading, error, isError } = usePlayers(selectedClub?.id);
  const { data: circles } = useCircles(selectedClub?.id);
  const { data: games } = useAllGames(selectedClub?.id);

  // Initialize state with defaults - URL params will be applied after mount
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Read URL params AFTER mount (safe - avoids hydration issues)
  useEffect(() => {
    if (!isInitialized && searchParams) {
      const circleParam = searchParams.get('circle');
      const periodParam = searchParams.get('period') as DateFilter;
      const startParam = searchParams.get('start');
      const endParam = searchParams.get('end');

      if (circleParam) {
        setSelectedCircleId(circleParam);
      }
      if (periodParam && ['all', '2weeks', '1month', '2months', 'custom'].includes(periodParam)) {
        setDateFilter(periodParam);
      }
      if (startParam) {
        setCustomStartDate(startParam);
      }
      if (endParam) {
        setCustomEndDate(endParam);
      }
      setIsInitialized(true);
    }
  }, [searchParams, isInitialized]);

  // Update URL when circle selection changes
  const handleCircleChange = (circleId: string | null) => {
    setSelectedCircleId(circleId);

    try {
      const params = new URLSearchParams(searchParams?.toString() || '');
      if (circleId) {
        params.set('circle', circleId);
      } else {
        params.delete('circle');
      }

      // Update URL without refreshing the page
      const newUrl = params.toString() ? `?${params.toString()}` : '/statistics';
      router.replace(newUrl, { scroll: false });
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  // Update URL when date filter changes
  const handleDateFilterChange = (period: DateFilter) => {
    setDateFilter(period);

    // Clear custom dates if switching away from custom
    if (period !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }

    try {
      const params = new URLSearchParams(searchParams?.toString() || '');
      if (period !== 'all') {
        params.set('period', period);
      } else {
        params.delete('period');
      }

      // Clear custom date params if not using custom
      if (period !== 'custom') {
        params.delete('start');
        params.delete('end');
      }

      // Update URL without refreshing the page
      const newUrl = params.toString() ? `?${params.toString()}` : '/statistics';
      router.replace(newUrl, { scroll: false });
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  // Update URL when custom dates change
  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);

    try {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('period', 'custom');
      if (start) {
        params.set('start', start);
      } else {
        params.delete('start');
      }
      if (end) {
        params.set('end', end);
      } else {
        params.delete('end');
      }

      const newUrl = params.toString() ? `?${params.toString()}` : '/statistics';
      router.replace(newUrl, { scroll: false });
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  // Sync state with URL changes (e.g., browser back/forward)
  // Only run after initial mount to avoid conflicts
  useEffect(() => {
    if (!isInitialized) return;

    const circleParam = searchParams?.get('circle') || null;
    const periodParam = searchParams?.get('period') as DateFilter;
    const startParam = searchParams?.get('start') || '';
    const endParam = searchParams?.get('end') || '';

    if (circleParam !== selectedCircleId) {
      setSelectedCircleId(circleParam);
    }

    if (periodParam && periodParam !== dateFilter && ['all', '2weeks', '1month', '2months', 'custom'].includes(periodParam)) {
      setDateFilter(periodParam);
    }

    if (startParam !== customStartDate) {
      setCustomStartDate(startParam);
    }
    if (endParam !== customEndDate) {
      setCustomEndDate(endParam);
    }
  }, [searchParams, isInitialized]);

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
        pointsFor: 0,
        pointsAgainst: 0,
        form: calculatePlayerForm(player.id, [], player.rating)
      }));
    }

    // Recalculate stats for each player
    const playerStatsMap = new Map<string, {
      wins: number;
      losses: number;
      pointsFor: number;
      pointsAgainst: number;
    }>();

    filteredGames.forEach(game => {
      const { team1, team2 } = game;

      // Skip games without team data
      if (!team1 || !team2) return;

      const team1Score = team1.score || 0;
      const team2Score = team2.score || 0;
      const team1Won = team1Score > team2Score;

      // Process team1 players
      if (team1.playerIds && Array.isArray(team1.playerIds)) {
        team1.playerIds.forEach(playerId => {
          const stats = playerStatsMap.get(playerId) || {
            wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0
          };

          if (team1Won) {
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
            wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0
          };

          if (!team1Won) {
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
        return { ...player, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, form };
      }
      return {
        ...player,
        wins: stats.wins,
        losses: stats.losses,
        pointsFor: stats.pointsFor,
        pointsAgainst: stats.pointsAgainst,
        form
      };
    });
  }, [allPlayersData, games, dateFilter, dateRange]);

  // Filter out players who haven't played any games for rankings
  const activePlayersData = filteredPlayersData.filter(player => (player.wins + player.losses) > 0);

  // Apply circle filtering
  const playersData = useMemo(() => {
    if (!selectedCircleId || !circles) {
      return activePlayersData;
    }

    const selectedCircle = circles.find(c => c.id === selectedCircleId);
    if (!selectedCircle) {
      return activePlayersData;
    }

    // Filter players to only include those in the selected circle
    return activePlayersData.filter(player =>
      selectedCircle.playerIds.includes(player.id)
    );
  }, [activePlayersData, selectedCircleId, circles]);

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
      <div className="space-y-6">
        {/* Header with filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Player Rankings</h1>
            <p className="text-muted-foreground">
              {selectedCircleName
                ? `Leaderboard for "${selectedCircleName}" circle`
                : 'Current player leaderboard showing all active players'
              }
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
                  <SelectItem value="1month">Last 1 Month</SelectItem>
                  <SelectItem value="2months">Last 2 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    {customStartDate && customEndDate
                      ? `${customStartDate} - ${customEndDate}`
                      : 'Select dates...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Circle Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CircleSelector
                selectedCircleId={selectedCircleId}
                onCircleChange={handleCircleChange}
                placeholder="Filter by circle..."
                showPlayerCount={true}
                size="default"
              />
            </div>

            {/* Player Count Badge */}
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              0 Players
            </Badge>
          </div>
        </div>

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Player Rankings</h1>
          <p className="text-muted-foreground">
            {selectedCircleName
              ? `Leaderboard for "${selectedCircleName}" circle`
              : 'Current player leaderboard showing all active players'
            }
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateFilter} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
                <SelectItem value="1month">Last 1 Month</SelectItem>
                <SelectItem value="2months">Last 2 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  {customStartDate && customEndDate
                    ? `${customStartDate} - ${customEndDate}`
                    : 'Select dates...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date-main">Start Date</Label>
                    <Input
                      id="start-date-main"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => handleCustomDateChange(e.target.value, customEndDate)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date-main">End Date</Label>
                    <Input
                      id="end-date-main"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => handleCustomDateChange(customStartDate, e.target.value)}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Circle Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CircleSelector
              selectedCircleId={selectedCircleId}
              onCircleChange={handleCircleChange}
              placeholder="Filter by circle..."
              showPlayerCount={true}
              size="default"
            />
          </div>

          {/* Player Count Badge */}
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {playersData.length} Player{playersData.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Statistics Table */}
      <SortableStatisticsTable
        players={playersData}
        showRating={dateFilter === 'all'}
        initialSortField={dateFilter === 'all' ? 'rating' : 'winPercentage'}
      />
    </div>
  );
}