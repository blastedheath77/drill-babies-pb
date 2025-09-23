import { RoundManagementClient } from './round-management-client';

interface RoundManagementPageProps {
  params: {
    id: string;
  };
}

export default function RoundManagementPage({ params }: RoundManagementPageProps) {
  return <RoundManagementClient boxLeagueId={params.id} />;
}