import { ErrorBoundary } from '@/components/error-boundary';
import { BoxLeaguesClient } from './box-leagues-client';

export default function BoxLeaguesPage() {
  return (
    <ErrorBoundary>
      <BoxLeaguesClient />
    </ErrorBoundary>
  );
}
