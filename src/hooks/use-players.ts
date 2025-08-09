import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPlayers, getPlayerById } from '@/lib/data';
import type { Player } from '@/lib/types';

// Query keys for consistent cache management
export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (filters: any) => [...playerKeys.lists(), filters] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (id: string) => [...playerKeys.details(), id] as const,
};

// Hook to get all players with caching
export function usePlayers() {
  return useQuery({
    queryKey: playerKeys.lists(),
    queryFn: getPlayers,
    staleTime: 30 * 1000, // Players list stays fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

// Hook to get a single player by ID with caching
export function usePlayer(playerId: string) {
  return useQuery({
    queryKey: playerKeys.detail(playerId),
    queryFn: () => getPlayerById(playerId),
    enabled: !!playerId,
    staleTime: 10 * 60 * 1000, // Individual player data stays fresh for 10 minutes
  });
}

// Hook to prefetch player data (useful for hovering over player names)
export function usePrefetchPlayer() {
  const queryClient = useQueryClient();

  return (playerId: string) => {
    queryClient.prefetchQuery({
      queryKey: playerKeys.detail(playerId),
      queryFn: () => getPlayerById(playerId),
      staleTime: 10 * 60 * 1000,
    });
  };
}

// Hook to invalidate player-related queries after mutations
export function useInvalidatePlayers() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: playerKeys.all }),
    invalidateList: () => queryClient.invalidateQueries({ queryKey: playerKeys.lists() }),
    invalidatePlayer: (playerId: string) =>
      queryClient.invalidateQueries({ queryKey: playerKeys.detail(playerId) }),
  };
}

// Optimistic update helper for player rating changes
export function useOptimisticPlayerUpdate() {
  const queryClient = useQueryClient();

  return (playerId: string, updates: Partial<Player>) => {
    queryClient.setQueryData(playerKeys.detail(playerId), (old: Player | undefined) => {
      if (!old) return old;
      return { ...old, ...updates };
    });

    // Also update the player in the players list
    queryClient.setQueryData(playerKeys.lists(), (old: Player[] | undefined) => {
      if (!old) return old;
      return old.map((player) =>
        player.id === playerId ? { ...player, ...updates } : player
      );
    });
  };
}