'use client';

import { notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  getPlayerById,
  getGamesForPlayer,
  getHeadToHeadStats,
  getPartnershipStats,
  getPlayers,
  calculatePlayerForm,
} from '@/lib/data';
import { CLUB_ID } from '@/config/club';
import { PlayerPageWrapper } from './player-page-wrapper';

async function loadPlayerPage(id: string) {
  const player = await getPlayerById(id);
  if (!player) return null;

  const [everyone, games] = await Promise.all([getPlayers(CLUB_ID), getGamesForPlayer(player.id, CLUB_ID)]);
  const allPlayers = everyone.filter((p) => p.id !== player.id);

  const partnerships = getPartnershipStats(player.id, games, allPlayers.concat(player));
  const firstOpponent = allPlayers[0];
  const headToHead = firstOpponent ? getHeadToHeadStats(player.id, firstOpponent.id, games) : null;
  const winPercentage =
    player.wins + player.losses > 0 ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0) : '0';

  return {
    player,
    games,
    partnerships,
    headToHead,
    allPlayers,
    winPercentage,
    pointsDiff: player.pointsFor - player.pointsAgainst,
    form: calculatePlayerForm(player.id, games, player.rating),
  };
}

export default function PlayerDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['player-page', params.id],
    queryFn: () => loadPlayerPage(params.id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-label="Loading" />
      </div>
    );
  }
  if (!data) notFound();
  return <PlayerPageWrapper {...data} />;
}
