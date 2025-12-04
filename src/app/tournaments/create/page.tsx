'use client';

import { CreateTournamentForm } from './create-tournament-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AuthWrapper } from '@/components/auth-wrapper';
import { usePlayers } from '@/hooks/use-players';
import { useClub } from '@/contexts/club-context';

function CreateTournamentContent() {
  const { selectedClub } = useClub();
  const { data: players, isLoading, error } = usePlayers(selectedClub?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading players...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load players. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/tournaments">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Tournament</h1>
          <p className="text-muted-foreground">Set up a new tournament for your club.</p>
        </div>
      </div>

      <CreateTournamentForm players={players || []} />
    </>
  );
}

export default function CreateTournamentPage() {
  return (
    <AuthWrapper playerOnly={true}>
      <CreateTournamentContent />
    </AuthWrapper>
  );
}
