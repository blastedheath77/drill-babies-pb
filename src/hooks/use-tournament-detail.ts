'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTournamentById, getTournamentMatches, getTournamentStandings, getPlayersByIds } from '@/lib/data';
import type { Player, Tournament, TournamentMatch, TournamentStanding } from '@/lib/types';

export const tournamentDetailKey = (id: string) => ['tournament-detail', id] as const;

export interface TournamentDetail {
  tournament: Tournament;
  matches: TournamentMatch[];
  standings: TournamentStanding[];
  playerMap: Map<string, Player>;
}

async function loadTournamentDetail(id: string): Promise<TournamentDetail | null> {
  const tournament = await getTournamentById(id);
  if (!tournament) return null;

  const [matches, standings] = await Promise.all([getTournamentMatches(id), getTournamentStandings(id)]);

  const ids = new Set<string>(tournament.playerIds ?? []);
  for (const m of matches) {
    [m.player1Id, m.player2Id, ...(m.team1PlayerIds ?? []), ...(m.team2PlayerIds ?? [])].forEach((pid) => pid && ids.add(pid));
  }
  const players = await getPlayersByIds([...ids]);
  return { tournament, matches, standings, playerMap: new Map(players.map((p) => [p.id, p])) };
}

export function useTournamentDetail(id: string) {
  return useQuery({
    queryKey: tournamentDetailKey(id),
    queryFn: () => loadTournamentDetail(id),
    staleTime: 10 * 1000,
  });
}

/** Call after any change to a tournament's matches so the screen refreshes. */
export function useRefreshTournament() {
  const queryClient = useQueryClient();
  return (id?: string) =>
    queryClient.invalidateQueries({ queryKey: id ? tournamentDetailKey(id) : ['tournament-detail'] });
}
