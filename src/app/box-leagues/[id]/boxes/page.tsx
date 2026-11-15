import { ErrorBoundary } from '@/components/error-boundary';
import { BoxManagementClient } from './box-management-client';

interface BoxManagementPageProps {
  params: {
    id: string;
  };
}

export default function BoxManagementPage({ params }: BoxManagementPageProps) {
  return (
    <ErrorBoundary>
      <BoxManagementClient boxLeagueId={params.id} />
    </ErrorBoundary>
  );
}
