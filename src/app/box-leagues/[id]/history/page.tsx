import { ErrorBoundary } from '@/components/error-boundary';
import { CycleHistoryClient } from './cycle-history-client';

export default function CycleHistoryPage({ params }: { params: { id: string } }) {
  return (
    <ErrorBoundary>
      <CycleHistoryClient boxLeagueId={params.id} />
    </ErrorBoundary>
  );
}
