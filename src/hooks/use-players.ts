import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPlayers, getPlayerById, getPlayerRatingHistory } from '@/lib/data';
import type { Player } from '@/lib/types';

// Query keys for consistent cache management
export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (clubId?: string, filters?: any) => [...playerKeys.lists(), clubId, filters] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (id: string) => [...playerKeys.details(), id] as const,
  ratingHistory: (id: string, days: number) => [...playerKeys.all, 'rating-history', id, days] as const,
};

// Hook to get all players with caching
export function usePlayers(clubId?: string) {
  return useQuery({
    queryKey: playerKeys.list(clubId),
    queryFn: () => getPlayers(clubId),
    staleTime: 10 * 1000, // Players list stays fresh for 10 seconds (shorter for consistency)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
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
    // Add refetch methods that return promises
    refetchAll: () => queryClient.refetchQueries({ queryKey: playerKeys.all }),
    refetchList: () => queryClient.refetchQueries({ queryKey: playerKeys.lists() }),
  };
}

// Optimistic update helper for player rating changes
export function useOptimisticPlayerUpdate() {
  const queryClient = useQueryClient();

  return (playerId: string, updates: Partial<Player>, clubId?: string) => {
    queryClient.setQueryData(playerKeys.detail(playerId), (old: Player | undefined) => {
      if (!old) return old;
      return { ...old, ...updates };
    });

    // Also update the player in the players list
    queryClient.setQueryData(playerKeys.list(clubId), (old: Player[] | undefined) => {
      if (!old) return old;
      return old.map((player) =>
        player.id === playerId ? { ...player, ...updates } : player
      );
    });
  };
}

// Hook to get player rating history with caching
export function usePlayerRatingHistory(playerId: string, days: number = 30) {
  return useQuery({
    queryKey: playerKeys.ratingHistory(playerId, days),
    queryFn: () => getPlayerRatingHistory(playerId, days),
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000, // Rating history stays fresh for 5 minutes
  });
}