import { PageHeader } from '@/components/page-header';
import {
  getTournamentById,
  getTournamentMatches,
  getTournamentStandings,
  getPlayerById,
} from '@/lib/data';
import { notFound } from 'next/navigation';
import { TournamentClient } from './tournament-client';
import type { Player } from '@/lib/types';

export default async function TournamentDetailPage({ params }: { params: { id: string } }) {
  const tournament = await getTournamentById(params.id);

  if (!tournament) {
    notFound();
  }

  const [matches, standings] = await Promise.all([
    getTournamentMatches(params.id),
    getTournamentStandings(params.id),
  ]);

  // Fetch all player data needed for matches
  const allPlayerIds = new Set<string>();
  matches.forEach((match) => {
    if (match.player1Id) allPlayerIds.add(match.player1Id);
    if (match.player2Id) allPlayerIds.add(match.player2Id);
    if (match.team1PlayerIds) match.team1PlayerIds.forEach((id) => allPlayerIds.add(id));
    if (match.team2PlayerIds) match.team2PlayerIds.forEach((id) => allPlayerIds.add(id));
  });

  const playerMap = new Map<string, Player>();
  await Promise.all(
    [...allPlayerIds].map(async (id) => {
      const player = await getPlayerById(id);
      if (player) playerMap.set(id, player);
    })
  );

  return (
    <>
      <PageHeader
        title={tournament.name}
        description={tournament.description}
      />
      <TournamentClient 
        tournament={tournament}
        matches={matches}
        standings={standings}
        playerMap={playerMap}
      />
    </>
  );
}
