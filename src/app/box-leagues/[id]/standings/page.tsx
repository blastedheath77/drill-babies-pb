import { StandingsClient } from './standings-client';

interface StandingsPageProps {
  params: {
    id: string;
  };
}

export default function StandingsPage({ params }: StandingsPageProps) {
  return <StandingsClient boxLeagueId={params.id} />;
}