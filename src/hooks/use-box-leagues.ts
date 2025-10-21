import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createBoxLeague,
  getBoxLeagues,
  getBoxLeague,
  updateBoxLeague,
  deleteBoxLeague,
  createBox,
  getBoxesByLeague,
  updateBox,
  createBoxLeagueRound,
  getRoundsByLeague,
  createBoxLeagueMatch,
  getMatchesByRound,
  getMatchesByBox,
  updateBoxLeagueMatch,
  createOrUpdatePlayerStats,
  getPlayerStatsByLeague,
  getPlayerStatsByBox
} from '@/lib/box-leagues';
import type {
  BoxLeague,
  Box,
  BoxLeagueRound,
  BoxLeagueMatch,
  BoxLeaguePlayerStats
} from '@/lib/types';

// Query Keys
const BOX_LEAGUE_KEYS = {
  all: ['boxLeagues'] as const,
  lists: () => [...BOX_LEAGUE_KEYS.all, 'list'] as const,
  list: (circleId?: string) => [...BOX_LEAGUE_KEYS.lists(), circleId] as const,
  details: () => [...BOX_LEAGUE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...BOX_LEAGUE_KEYS.details(), id] as const,
  boxes: (leagueId: string) => [...BOX_LEAGUE_KEYS.detail(leagueId), 'boxes'] as const,
  rounds: (leagueId: string) => [...BOX_LEAGUE_KEYS.detail(leagueId), 'rounds'] as const,
  matches: () => [...BOX_LEAGUE_KEYS.all, 'matches'] as const,
  matchesByRound: (roundId: string) => [...BOX_LEAGUE_KEYS.matches(), 'round', roundId] as const,
  matchesByBox: (boxId: string) => [...BOX_LEAGUE_KEYS.matches(), 'box', boxId] as const,
  stats: () => [...BOX_LEAGUE_KEYS.all, 'stats'] as const,
  statsByLeague: (leagueId: string) => [...BOX_LEAGUE_KEYS.stats(), 'league', leagueId] as const,
  statsByBox: (boxId: string) => [...BOX_LEAGUE_KEYS.stats(), 'box', boxId] as const,
};

// Box League Hooks
export function useBoxLeagues(circleId?: string) {
  return useQuery({
    queryKey: BOX_LEAGUE_KEYS.list(circleId),
    queryFn: () => getBoxLeagues(circleId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBoxLeague(id: string) {
  return useQuery({
    queryKey: BOX_LEAGUE_KEYS.detail(id),
    queryFn: () => getBoxLeague(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBoxLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<BoxLeague, 'id' | 'createdDate' | 'currentCycle' | 'currentRound'>) =>
      createBoxLeague(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.lists() });
    },
  });
}

export function useUpdateBoxLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BoxLeague> }) =>
      updateBoxLeague(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.lists() });
    },
  });
}

export function useDeleteBoxLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBoxLeague(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.all });
    },
  });
}

// Box Hooks
export function useBoxesByLeague(boxLeagueId: string) {
  return useQuery({
    queryKey: BOX_LEAGUE_KEYS.boxes(boxLeagueId),
    queryFn: () => getBoxesByLeague(boxLeagueId),
    enabled: !!boxLeagueId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Box, 'id' | 'createdDate'>) => createBox(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.boxes(data.boxLeagueId) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.detail(data.boxLeagueId) });
    },
  });
}

export function useUpdateBox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Box> }) =>
      updateBox(id, updates),
    onSuccess: (_, { updates }) => {
      if (updates.boxLeagueId) {
        queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.boxes(updates.boxLeagueId) });
        queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.detail(updates.boxLeagueId) });
      }
    },
  });
}

// Round Hooks
export function useRoundsByLeague(boxLeagueId: string) {
  return useQuery({
    queryKey: BOX_LEAGUE_KEYS.rounds(boxLeagueId),
    queryFn: () => getRoundsByLeague(boxLeagueId),
    enabled: !!boxLeagueId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateBoxLeagueRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<BoxLeagueRound, 'id' | 'createdDate' | 'matchIds'>) =>
      createBoxLeagueRound(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.rounds(data.boxLeagueId) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.detail(data.boxLeagueId) });
    },
  });
}

// Match Hooks
export function useMatchesByRound(roundId: string) {
  return useQuery({
    queryKey: BOX_LEAGUE_KEYS.matchesByRound(roundId),
    queryFn: () => getMatchesByRound(roundId),
    enabled: !!roundId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useMatchesByBox(boxId: string) {
  return useQuery({
    queryKey: BOX_LEAGUE_KEYS.matchesByBox(boxId),
    queryFn: () => getMatchesByBox(boxId),
    enabled: !!boxId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useCreateBoxLeagueMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<BoxLeagueMatch, 'id'>) => createBoxLeagueMatch(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.matchesByRound(data.boxLeagueRoundId) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.matchesByBox(data.boxId) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.rounds(data.boxLeagueId) });
    },
  });
}

export function useUpdateBoxLeagueMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates, match }: { id: string; updates: Partial<BoxLeagueMatch>; match?: BoxLeagueMatch }) =>
      updateBoxLeagueMatch(id, updates),
    onSuccess: (_, { updates, match }) => {
      // Use match data if provided, otherwise try to get IDs from updates
      const boxLeagueRoundId = match?.boxLeagueRoundId || updates.boxLeagueRoundId;
      const boxId = match?.boxId || updates.boxId;
      const boxLeagueId = match?.boxLeagueId || updates.boxLeagueId;

      // Invalidate queries to refresh UI
      if (boxLeagueRoundId) {
        queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.matchesByRound(boxLeagueRoundId) });
      }
      if (boxId) {
        queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.matchesByBox(boxId) });
        queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.statsByBox(boxId) });
      }
      if (boxLeagueId) {
        queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.rounds(boxLeagueId) });
        queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.statsByLeague(boxLeagueId) });
        queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.detail(boxLeagueId) });
      }
    },
  });
}

// Player Stats Hooks
export function usePlayerStatsByLeague(boxLeagueId: string) {
  return useQuery({
    queryKey: BOX_LEAGUE_KEYS.statsByLeague(boxLeagueId),
    queryFn: () => getPlayerStatsByLeague(boxLeagueId),
    enabled: !!boxLeagueId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePlayerStatsByBox(boxId: string) {
  return useQuery({
    queryKey: BOX_LEAGUE_KEYS.statsByBox(boxId),
    queryFn: () => getPlayerStatsByBox(boxId),
    enabled: !!boxId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateOrUpdatePlayerStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<BoxLeaguePlayerStats, 'id' | 'lastUpdated'>) =>
      createOrUpdatePlayerStats(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.statsByLeague(data.boxLeagueId) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.statsByBox(data.boxId) });
    },
  });
}

// Round Management Hooks
export function useDeleteRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roundId, boxLeagueId }: { roundId: string; boxLeagueId: string }) => {
      const { deleteRound } = await import('@/lib/box-league-logic');
      return deleteRound(roundId, boxLeagueId);
    },
    onSuccess: (_, { boxLeagueId }) => {
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.rounds(boxLeagueId) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.detail(boxLeagueId) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.matches() });
    },
  });
}

export function useValidateRoundDeletion() {
  return useMutation({
    mutationFn: async ({ roundId, boxLeagueId }: { roundId: string; boxLeagueId: string }) => {
      const { validateRoundDeletion } = await import('@/lib/box-league-logic');
      return validateRoundDeletion(roundId, boxLeagueId);
    },
  });
}

// Player Swap Hooks
export function useSwapPlayers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      boxLeagueId,
      playerId1,
      boxId1,
      playerId2,
      boxId2
    }: {
      boxLeagueId: string;
      playerId1: string;
      boxId1: string;
      playerId2: string;
      boxId2: string;
    }) => {
      const { swapPlayers } = await import('@/lib/box-league-logic');
      return swapPlayers(boxLeagueId, playerId1, boxId1, playerId2, boxId2);
    },
    onSuccess: (_, { boxLeagueId, boxId1, boxId2 }) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.boxes(boxLeagueId) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.statsByLeague(boxLeagueId) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.statsByBox(boxId1) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.statsByBox(boxId2) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.matchesByBox(boxId1) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.matchesByBox(boxId2) });
      queryClient.invalidateQueries({ queryKey: BOX_LEAGUE_KEYS.detail(boxLeagueId) });
    },
  });
}

export function useAnalyzeSwapImpact() {
  return useMutation({
    mutationFn: async ({
      boxLeagueId,
      playerId1,
      boxId1,
      playerId2,
      boxId2
    }: {
      boxLeagueId: string;
      playerId1: string;
      boxId1: string;
      playerId2: string;
      boxId2: string;
    }) => {
      const { analyzeSwapImpact } = await import('@/lib/box-league-logic');
      return analyzeSwapImpact(boxLeagueId, playerId1, boxId1, playerId2, boxId2);
    },
  });
}