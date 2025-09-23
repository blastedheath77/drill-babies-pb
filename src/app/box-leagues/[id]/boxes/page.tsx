import { BoxManagementClient } from './box-management-client';

interface BoxManagementPageProps {
  params: {
    id: string;
  };
}

export default function BoxManagementPage({ params }: BoxManagementPageProps) {
  return <BoxManagementClient boxLeagueId={params.id} />;
}