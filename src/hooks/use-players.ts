import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPlayers, getPlayerById, getPlayersInCircle, getPlayersInUserCircles } from '@/lib/data';
import { useCircles } from '@/contexts/circle-context';
import type { Player } from '@/lib/types';

// Circle-aware query keys for consistent cache management
export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (circleId?: string | null) => [...playerKeys.lists(), circleId] as const,
  circle: (circleId: string) => [...playerKeys.lists(), 'circle', circleId] as const,
  userCircles: (circleIds: string[]) => [...playerKeys.lists(), 'userCircles', circleIds] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (id: string) => [...playerKeys.details(), id] as const,
};

// Circle-aware hook to get players with caching
export function usePlayers() {
  const { selectedCircleId, availableCircles } = useCircles();
  
  // Determine query parameters based on circle context
  const getQueryParams = () => {
    if (selectedCircleId === 'all') {
      // For "All Circles" mode, get players from user's circles
      const userCircleIds = availableCircles.map(circle => circle.id);
      return { mode: 'userCircles', circleIds: userCircleIds };
    } else {
      // For specific circle, get players for that circle
      return { mode: 'circle', circleId: selectedCircleId };
    }
  };
  
  const { mode, circleId, circleIds } = getQueryParams();
  
  return useQuery({
    queryKey: mode === 'userCircles' 
      ? playerKeys.userCircles(circleIds || [])
      : playerKeys.list(circleId),
    queryFn: () => {
      if (mode === 'userCircles' && circleIds) {
        return getPlayersInUserCircles(circleIds);
      } else {
        return getPlayers(circleId);
      }
    },
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