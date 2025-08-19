import { GameDetailsClient } from './client';
import { DataErrorBoundary } from '@/components/data-error-boundary';

interface GameDetailsPageProps {
  params: {
    id: string;
  };
}

export default function GameDetailsPage({ params }: GameDetailsPageProps) {
  return (
    <DataErrorBoundary
      fallbackTitle="Game Details Unavailable"
      fallbackDescription="Unable to load game details. The game may not exist or there may be a connection issue."
    >
      <GameDetailsClient gameId={params.id} />
    </DataErrorBoundary>
  );
}