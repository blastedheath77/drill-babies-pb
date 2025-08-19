'use client';

import { usePlayers } from '@/hooks/use-players';
import { SortableStatisticsTable } from '@/components/sortable-statistics-table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { Player } from '@/lib/types';

interface StatisticsClientProps {
  initialPlayers: Player[];
}

export function StatisticsClient({ initialPlayers }: StatisticsClientProps) {
  const { data: players, isLoading, error, isError } = usePlayers();

  // Use React Query data if available, otherwise fall back to initial data
  const allPlayersData = players || initialPlayers;
  
  // Filter out players who haven't played any games for rankings
  const playersData = allPlayersData.filter(player => (player.wins + player.losses) > 0);

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
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="ml-auto flex space-x-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <SortableStatisticsTable players={playersData} />;
}