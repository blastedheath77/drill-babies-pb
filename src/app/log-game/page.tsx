'use client';

import { LogGameClientPage } from './log-game-client-page';
import { usePlayers } from '@/hooks/use-players';
import { PageHeader } from '@/components/page-header';

export default function LogGamePage() {
  const { data: players, isLoading, error } = usePlayers();

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <PageHeader
          title="Log Game"
          description="Record the results of a pickleball match."
        />
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading players...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <PageHeader
          title="Log Game"
          description="Record the results of a pickleball match."
        />
        <div className="text-center py-8">
          <p className="text-destructive">Failed to load players. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return <LogGameClientPage players={players || []} />;
}
