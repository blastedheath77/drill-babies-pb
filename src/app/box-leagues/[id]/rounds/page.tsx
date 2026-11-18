import { ErrorBoundary } from '@/components/error-boundary';
import { RoundManagementClient } from './round-management-client';

interface RoundManagementPageProps {
  params: {
    id: string;
  };
}

export default function RoundManagementPage({ params }: RoundManagementPageProps) {
  return (
    <ErrorBoundary>
      <RoundManagementClient boxLeagueId={params.id} />
    </ErrorBoundary>
  );
}
