import { GamesClient } from './games-client';
import { DataErrorBoundary } from '@/components/data-error-boundary';

export default function GamesPage() {
  return (
    <DataErrorBoundary
      fallbackTitle="Games Data Unavailable"
      fallbackDescription="Unable to load games data. This may be due to a connection issue or if no games have been recorded yet."
    >
      <GamesClient />
    </DataErrorBoundary>
  );
}