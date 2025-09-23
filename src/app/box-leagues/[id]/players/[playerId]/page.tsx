import { PlayerStatsClient } from './player-stats-client';

interface PlayerStatsPageProps {
  params: {
    id: string;
    playerId: string;
  };
}

export default function PlayerStatsPage({ params }: PlayerStatsPageProps) {
  return <PlayerStatsClient boxLeagueId={params.id} playerId={params.playerId} />;
}