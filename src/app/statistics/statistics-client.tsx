'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlayers } from '@/hooks/use-players';
import { useCircles } from '@/hooks/use-circles';
import { useClub } from '@/contexts/club-context';
import { SortableStatisticsTable } from '@/components/sortable-statistics-table';
import { CircleSelector } from '@/components/circle-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users, Filter } from 'lucide-react';
import type { Player } from '@/lib/types';

interface StatisticsClientProps {
  initialPlayers: Player[];
}

export function StatisticsClient({ initialPlayers }: StatisticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { data: players, isLoading, error, isError } = usePlayers(selectedClub?.id);
  const { data: circles } = useCircles(selectedClub?.id);

  // Initialize state from URL params
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(() => {
    return searchParams.get('circle') || null;
  });

  // Update URL when circle selection changes
  const handleCircleChange = (circleId: string | null) => {
    setSelectedCircleId(circleId);

    const params = new URLSearchParams(searchParams.toString());
    if (circleId) {
      params.set('circle', circleId);
    } else {
      params.delete('circle');
    }

    // Update URL without refreshing the page
    const newUrl = params.toString() ? `?${params.toString()}` : '/statistics';
    router.replace(newUrl, { scroll: false });
  };

  // Sync state with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const circleParam = searchParams.get('circle');
    if (circleParam !== selectedCircleId) {
      setSelectedCircleId(circleParam);
    }
  }, [searchParams, selectedCircleId]);

  // Use React Query data if available, otherwise fall back to initial data
  const allPlayersData = players || initialPlayers;

  // Filter out players who haven't played any games for rankings
  const activePlayersData = allPlayersData.filter(player => (player.wins + player.losses) > 0);

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
          <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-3">
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
      <SortableStatisticsTable players={playersData} />
    </div>
  );
}