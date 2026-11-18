import { ErrorBoundary } from '@/components/error-boundary';
import { CycleCompletionClient } from './cycle-completion-client';

export default function CycleCompletionPage({ params }: { params: { id: string } }) {
  return (
    <ErrorBoundary>
      <CycleCompletionClient boxLeagueId={params.id} />
    </ErrorBoundary>
  );
}
