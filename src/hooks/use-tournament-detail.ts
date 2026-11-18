'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTournamentById, getTournamentMatches, getTournamentStandings, getPlayersByIds } from '@/lib/data';
import type { Player, Tournament, TournamentMatch, TournamentStanding } from '@/lib/types';

export const tournamentDetailKey = (id: string) => ['tournament-detail', id] as const;

export interface TournamentDetail {
  tournament: Tournament;
  matches: TournamentMatch[];
  standings: TournamentStanding[];
  playerMap: Map<string, Player>;
  /** Scores of completed matches, keyed by gameId */
  scores: Map<string, { team1: number; team2: number }>;
}

async function loadTournamentDetail(id: string): Promise<TournamentDetail | null> {
  const tournament = await getTournamentById(id);
  if (!tournament) return null;

  const [matches, standings, gamesSnap] = await Promise.all([
    getTournamentMatches(id),
    getTournamentStandings(id),
    getDocs(query(collection(db, 'games'), where('tournamentId', '==', id))),
  ]);
  const scores = new Map(
    gamesSnap.docs.map((d) => [d.id, { team1: d.get('team1')?.score ?? 0, team2: d.get('team2')?.score ?? 0 }])
  );

  const ids = new Set<string>(tournament.playerIds ?? []);
  for (const m of matches) {
    [m.player1Id, m.player2Id, ...(m.team1PlayerIds ?? []), ...(m.team2PlayerIds ?? [])].forEach((pid) => pid && ids.add(pid));
  }
  const players = await getPlayersByIds([...ids]);
  return { tournament, matches, standings, scores, playerMap: new Map(players.map((p) => [p.id, p])) };
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
