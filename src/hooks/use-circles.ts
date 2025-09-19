import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCircles,
  getCircleById,
  getCirclesForPlayer,
  getCirclesWithPlayerCount,
  createCircle,
  updateCircle,
  deleteCircle,
  isCircleNameAvailable,
} from '@/lib/circles';
import type { Circle } from '@/lib/types';

// Query keys for consistent cache management
export const circleKeys = {
  all: ['circles'] as const,
  lists: () => [...circleKeys.all, 'list'] as const,
  list: (filters: any) => [...circleKeys.lists(), filters] as const,
  details: () => [...circleKeys.all, 'detail'] as const,
  detail: (id: string) => [...circleKeys.details(), id] as const,
  forPlayer: (playerId: string) => [...circleKeys.all, 'player', playerId] as const,
  withPlayerCount: () => [...circleKeys.all, 'withPlayerCount'] as const,
  nameAvailable: (name: string, excludeId?: string) => [
    ...circleKeys.all,
    'nameAvailable',
    name,
    excludeId,
  ] as const,
};

// Hook to get all circles with caching
export function useCircles() {
  return useQuery({
    queryKey: circleKeys.lists(),
    queryFn: getCircles,
    staleTime: 5 * 60 * 1000, // Circles stay fresh for 5 minutes (increased for better performance)
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus (reduces unnecessary calls)
    refetchOnMount: 'always', // Ensure fresh data when component mounts
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

// Hook to get circles with player count
export function useCirclesWithPlayerCount() {
  return useQuery({
    queryKey: circleKeys.withPlayerCount(),
    queryFn: getCirclesWithPlayerCount,
    staleTime: 5 * 60 * 1000, // Stay fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook to get a single circle by ID with caching
export function useCircle(circleId: string) {
  return useQuery({
    queryKey: circleKeys.detail(circleId),
    queryFn: () => getCircleById(circleId),
    enabled: !!circleId,
    staleTime: 10 * 60 * 1000, // Individual circle data stays fresh for 10 minutes
    cacheTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook to get circles for a specific player
export function useCirclesForPlayer(playerId: string) {
  return useQuery({
    queryKey: circleKeys.forPlayer(playerId),
    queryFn: () => getCirclesForPlayer(playerId),
    enabled: !!playerId,
    staleTime: 2 * 60 * 1000, // Player circles stay fresh for 2 minutes
  });
}

// Hook to check if a circle name is available
export function useCircleNameAvailable(name: string, excludeId?: string) {
  return useQuery({
    queryKey: circleKeys.nameAvailable(name, excludeId),
    queryFn: () => isCircleNameAvailable(name, excludeId),
    enabled: !!name && name.trim().length > 0,
    staleTime: 10 * 1000, // Name availability checks stay fresh for 10 seconds
  });
}

// Hook to create a new circle
export function useCreateCircle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCircle,
    onSuccess: (circleId, variables) => {
      // Invalidate all circle-related queries
      queryClient.invalidateQueries({ queryKey: circleKeys.all });

      // Optionally prefetch the newly created circle
      queryClient.prefetchQuery({
        queryKey: circleKeys.detail(circleId),
        queryFn: () => getCircleById(circleId),
      });
    },
    onError: (error) => {
      console.error('Failed to create circle:', error);
    },
  });
}

// Hook to update an existing circle
export function useUpdateCircle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCircle>[1] }) =>
      updateCircle(id, data),
    onSuccess: (_, variables) => {
      // Invalidate all circle-related queries
      queryClient.invalidateQueries({ queryKey: circleKeys.all });

      // Specifically invalidate the updated circle
      queryClient.invalidateQueries({ queryKey: circleKeys.detail(variables.id) });

      // If players were updated, invalidate player-specific circle queries
      if (variables.data.playerIds) {
        // We could track which players were affected, but for simplicity invalidate all player queries
        queryClient.invalidateQueries({ queryKey: ['circles', 'player'] });
      }
    },
    onError: (error) => {
      console.error('Failed to update circle:', error);
    },
  });
}

// Hook to delete a circle
export function useDeleteCircle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCircle,
    onSuccess: (_, circleId) => {
      // Remove the deleted circle from cache
      queryClient.removeQueries({ queryKey: circleKeys.detail(circleId) });

      // Invalidate all circle lists to remove the deleted circle
      queryClient.invalidateQueries({ queryKey: circleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: circleKeys.withPlayerCount() });

      // Invalidate player-specific circle queries since a circle was deleted
      queryClient.invalidateQueries({ queryKey: ['circles', 'player'] });
    },
    onError: (error) => {
      console.error('Failed to delete circle:', error);
    },
  });
}

// Hook to prefetch circle data (useful for hovering over circle names)
export function usePrefetchCircle() {
  const queryClient = useQueryClient();

  return (circleId: string) => {
    queryClient.prefetchQuery({
      queryKey: circleKeys.detail(circleId),
      queryFn: () => getCircleById(circleId),
      staleTime: 10 * 60 * 1000,
      cacheTime: 60 * 60 * 1000,
    });
  };
}

// Hook for background data refresh
export function useBackgroundCircleRefresh() {
  const queryClient = useQueryClient();

  return {
    refreshAll: () => {
      // Silently refresh all circle data in the background
      queryClient.refetchQueries({
        queryKey: circleKeys.all,
        type: 'active' // Only refetch currently active queries
      });
    },
    refreshCirclesList: () => {
      queryClient.refetchQueries({
        queryKey: circleKeys.lists(),
        type: 'active'
      });
    },
  };
}

// Hook to invalidate circle-related queries after mutations
export function useInvalidateCircles() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: circleKeys.all }),
    invalidateList: () => queryClient.invalidateQueries({ queryKey: circleKeys.lists() }),
    invalidateCircle: (circleId: string) =>
      queryClient.invalidateQueries({ queryKey: circleKeys.detail(circleId) }),
    invalidateForPlayer: (playerId: string) =>
      queryClient.invalidateQueries({ queryKey: circleKeys.forPlayer(playerId) }),
    // Add refetch methods that return promises
    refetchAll: () => queryClient.refetchQueries({ queryKey: circleKeys.all }),
    refetchList: () => queryClient.refetchQueries({ queryKey: circleKeys.lists() }),
    refetchWithPlayerCount: () => queryClient.refetchQueries({ queryKey: circleKeys.withPlayerCount() }),
  };
}

// Optimistic update helper for circle modifications
export function useOptimisticCircleUpdate() {
  const queryClient = useQueryClient();

  return (circleId: string, updates: Partial<Circle>) => {
    // Update the specific circle in cache
    queryClient.setQueryData(circleKeys.detail(circleId), (old: Circle | undefined) => {
      if (!old) return old;
      return { ...old, ...updates };
    });

    // Also update the circle in the circles list
    queryClient.setQueryData(circleKeys.lists(), (old: Circle[] | undefined) => {
      if (!old) return old;
      return old.map((circle) =>
        circle.id === circleId ? { ...circle, ...updates } : circle
      );
    });

    // Update the circles with player count list if needed
    if (updates.playerIds) {
      queryClient.setQueryData(circleKeys.withPlayerCount(), (old: Array<Circle & { playerCount: number }> | undefined) => {
        if (!old) return old;
        return old.map((circle) =>
          circle.id === circleId
            ? { ...circle, ...updates, playerCount: updates.playerIds?.length ?? circle.playerCount }
            : circle
        );
      });
    }
  };
}