import { notFound } from 'next/navigation';
import {
  getPlayerById,
  getGamesForPlayer,
  getHeadToHeadStats,
  getPartnershipStats,
  getPlayers,
  calculatePlayerForm,
} from '@/lib/data';
import { PlayerPageWrapper } from './player-page-wrapper';

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const player = await getPlayerById(params.id);
  if (!player) {
    notFound();
  }

  const allPlayers = (await getPlayers()).filter((p) => p.id !== player.id);
  const games = await getGamesForPlayer(player.id);

  const partnerships = getPartnershipStats(player.id, games, allPlayers.concat(player));
  const firstOpponent = allPlayers[0];
  const headToHead = firstOpponent ? getHeadToHeadStats(player.id, firstOpponent.id, games) : null;

  const winPercentage =
    player.wins + player.losses > 0
      ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0)
      : '0';
  const pointsDiff = player.pointsFor - player.pointsAgainst;

  // Calculate player form
  const form = calculatePlayerForm(player.id, games, player.rating);

  return (
    <PlayerPageWrapper
      player={player}
      games={games}
      partnerships={partnerships}
      headToHead={headToHead}
      allPlayers={allPlayers}
      winPercentage={winPercentage}
      pointsDiff={pointsDiff}
      form={form}
    />
  );
}
