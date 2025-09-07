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

// Hook to get players with optional circle filtering
export function usePlayers(circleId?: string | null) {
  const { selectedCircleId, availableCircles } = useCircles();
  
  // Use provided circleId or fall back to context, but default to showing ALL players
  const effectiveCircleId = circleId !== undefined ? circleId : 
    (selectedCircleId === 'all' ? null : selectedCircleId);
  
  return useQuery({
    queryKey: playerKeys.list(effectiveCircleId),
    queryFn: () => getPlayers(effectiveCircleId),
    staleTime: 10 * 1000, // Players list stays fresh for 10 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
  });
}

// Circle-aware hook that respects circle filtering (for pages that need it)
export function usePlayersInCircles() {
  const { selectedCircleId, availableCircles } = useCircles();
  
  // Determine query parameters based on circle context
  const getQueryParams = () => {
    console.log(`[usePlayersInCircles] 🔍 DEBUGGING CIRCLE CONTEXT:`);
    console.log(`[usePlayersInCircles] - selectedCircleId: ${selectedCircleId}`);
    console.log(`[usePlayersInCircles] - availableCircles:`, availableCircles);
    console.log(`[usePlayersInCircles] - availableCircles.length: ${availableCircles.length}`);
    
    if (selectedCircleId === 'all') {
      // For "All Circles" mode, get players from user's circles
      const userCircleIds = availableCircles.map(circle => circle.id);
      console.log(`[usePlayersInCircles] ✅ Mode: userCircles, circleIds:`, userCircleIds);
      return { mode: 'userCircles', circleIds: userCircleIds };
    } else {
      // For specific circle, get players for that circle
      console.log(`[usePlayersInCircles] ✅ Mode: circle, circleId: ${selectedCircleId}`);
      return { mode: 'circle', circleId: selectedCircleId };
    }
  };
  
  const { mode, circleId, circleIds } = getQueryParams();
  
  return useQuery({
    queryKey: mode === 'userCircles' 
      ? playerKeys.userCircles(circleIds || [])
      : playerKeys.list(circleId),
    queryFn: async ({ queryKey }) => {
      try {
        // Extract parameters from closure, not from React Query parameters
        const currentMode = mode;
        const currentCircleId = circleId;
        const currentCircleIds = circleIds;
        
        console.log(`[usePlayersInCircles] QueryFn called - mode: ${currentMode}, circleId: ${currentCircleId}, circleIds:`, currentCircleIds);
        
        if (currentMode === 'userCircles' && currentCircleIds) {
          const result = await getPlayersInUserCircles(currentCircleIds);
          console.log(`[usePlayersInCircles] Retrieved ${result.length} players for circles:`, currentCircleIds);
          return result;
        } else if (currentMode === 'circle' && currentCircleId) {
          const result = await getPlayers(currentCircleId);
          console.log(`[usePlayersInCircles] Retrieved ${result.length} players for circle:`, currentCircleId);
          return result;
        } else {
          // Fallback: get all players when no valid circle context
          console.log(`[usePlayersInCircles] No valid circle context, getting all players`);
          const result = await getPlayers();
          return result;
        }
      } catch (error) {
        console.error('[usePlayersInCircles] Query failed:', error);
        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }
    },
    staleTime: 10 * 1000, // Players list stays fresh for 10 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
    retry: (failureCount, error) => {
      // Retry up to 2 times for network errors, but not for Firebase index errors
      if (failureCount >= 2) return false;
      if (error && error.toString().includes('requires an index')) {
        console.warn('[usePlayersInCircles] Firebase index missing, not retrying');
        return false;
      }
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
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
    // Invalidate circle-specific caches
    invalidateCircle: (circleId: string) => 
      queryClient.invalidateQueries({ queryKey: playerKeys.circle(circleId) }),
    invalidateUserCircles: (circleIds: string[]) =>
      queryClient.invalidateQueries({ queryKey: playerKeys.userCircles(circleIds) }),
    // Add refetch methods that return promises
    refetchAll: () => queryClient.refetchQueries({ queryKey: playerKeys.all }),
    refetchList: () => queryClient.refetchQueries({ queryKey: playerKeys.lists() }),
    // Clear all circle-related caches (useful when circle membership changes)
    clearCircleCaches: () => {
      queryClient.removeQueries({ queryKey: playerKeys.lists() });
      console.log('[useInvalidatePlayers] Cleared all circle-related player caches');
    },
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