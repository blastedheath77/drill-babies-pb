import { BoxLeagueDetailClient } from './box-league-detail-client';

interface BoxLeagueDetailPageProps {
  params: {
    id: string;
  };
}

export default function BoxLeagueDetailPage({ params }: BoxLeagueDetailPageProps) {
  return <BoxLeagueDetailClient boxLeagueId={params.id} />;
}