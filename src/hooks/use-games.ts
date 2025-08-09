import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecentGames, getGamesForPlayer, getTotalGamesCount } from '@/lib/data';
import type { Game } from '@/lib/types';

// Query keys for games
export const gameKeys = {
  all: ['games'] as const,
  lists: () => [...gameKeys.all, 'list'] as const,
  recent: (count?: number) => [...gameKeys.lists(), 'recent', count] as const,
  player: (playerId: string) => [...gameKeys.lists(), 'player', playerId] as const,
  count: () => [...gameKeys.all, 'count'] as const,
};

// Hook to get recent games with caching
export function useRecentGames(count: number = 5) {
  return useQuery({
    queryKey: gameKeys.recent(count),
    queryFn: () => getRecentGames(count),
    staleTime: 2 * 60 * 1000, // Recent games stay fresh for 2 minutes
  });
}

// Hook to get games for a specific player
export function usePlayerGames(playerId: string) {
  return useQuery({
    queryKey: gameKeys.player(playerId),
    queryFn: () => getGamesForPlayer(playerId),
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000, // Player games stay fresh for 5 minutes
  });
}

// Hook to get total games count
export function useTotalGamesCount() {
  return useQuery({
    queryKey: gameKeys.count(),
    queryFn: getTotalGamesCount,
    staleTime: 5 * 60 * 1000, // Games count stays fresh for 5 minutes
  });
}

// Hook to invalidate game-related queries after mutations
export function useInvalidateGames() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: gameKeys.all }),
    invalidateRecent: () => queryClient.invalidateQueries({ queryKey: gameKeys.recent() }),
    invalidatePlayerGames: (playerId: string) =>
      queryClient.invalidateQueries({ queryKey: gameKeys.player(playerId) }),
    invalidateCount: () => queryClient.invalidateQueries({ queryKey: gameKeys.count() }),
  };
}

// Optimistic update for new games
export function useOptimisticGameAdd() {
  const queryClient = useQueryClient();

  return (newGame: Game) => {
    // Add to recent games cache
    queryClient.setQueryData(gameKeys.recent(5), (old: Game[] | undefined) => {
      if (!old) return [newGame];
      return [newGame, ...old.slice(0, 4)]; // Keep only 5 recent games
    });

    // Update total count
    queryClient.setQueryData(gameKeys.count(), (old: number | undefined) => {
      return (old || 0) + 1;
    });

    // Invalidate player-specific games
    newGame.playerIds.forEach((playerId) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.player(playerId) });
    });
  };
}