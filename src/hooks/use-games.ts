import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecentGames, getGamesForPlayer, getTotalGamesCount, getAllGames, getPlayers, getTournamentsByStatus, getTournaments, getGamesForUserCircles } from '@/lib/data';
import { useCircles } from '@/contexts/circle-context';
import type { Game, Tournament } from '@/lib/types';

// Query keys for games - now circle-aware
export const gameKeys = {
  all: ['games'] as const,
  lists: () => [...gameKeys.all, 'list'] as const,
  allGames: (circleId?: string | null) => [...gameKeys.lists(), 'all', circleId] as const,
  recent: (count?: number, circleId?: string | null) => [...gameKeys.lists(), 'recent', count, circleId] as const,
  player: (playerId: string) => [...gameKeys.lists(), 'player', playerId] as const,
  count: (circleId?: string | null) => [...gameKeys.all, 'count', circleId] as const,
  userCircles: (userCircleIds: string[]) => [...gameKeys.lists(), 'userCircles', userCircleIds] as const,
};

// Circle-aware hook to get all games with caching
export function useAllGames() {
  const { selectedCircleId, availableCircles } = useCircles();
  
  // Determine query parameters based on circle context
  const getQueryParams = () => {
    if (selectedCircleId === 'all') {
      // For "All Circles" mode, get games from user's circles
      const userCircleIds = availableCircles.map(circle => circle.id);
      console.log('[useAllGames] All Circles mode - userCircleIds:', userCircleIds);
      return { mode: 'userCircles', circleIds: userCircleIds };
    } else {
      // For specific circle, get games for that circle
      console.log('[useAllGames] Specific circle mode - circleId:', selectedCircleId);
      return { mode: 'circle', circleId: selectedCircleId };
    }
  };
  
  const { mode, circleId, circleIds } = getQueryParams();
  
  // Debug logging
  console.log('[useAllGames] Query parameters:', { 
    mode, 
    circleId, 
    circleIds, 
    selectedCircleId,
    availableCirclesCount: availableCircles.length 
  });
  
  return useQuery({
    queryKey: mode === 'userCircles' 
      ? gameKeys.userCircles(circleIds || [])
      : gameKeys.allGames(circleId),
    queryFn: async () => {
      console.log('[useAllGames] Executing query function with:', { mode, circleId, circleIds });
      
      let result;
      if (mode === 'userCircles' && circleIds) {
        console.log('[useAllGames] Calling getGamesForUserCircles with:', circleIds);
        result = await getGamesForUserCircles(circleIds);
      } else {
        console.log('[useAllGames] Calling getAllGames with circleId:', circleId);
        result = await getAllGames(circleId);
      }
      
      console.log('[useAllGames] Query result:', {
        gameCount: result.length,
        firstGame: result[0] ? {
          id: result[0].id,
          date: result[0].date,
          circleId: result[0].circleId || 'NO_CIRCLE_ID',
          type: result[0].type
        } : 'NO_GAMES'
      });
      
      return result;
    },
    staleTime: 2 * 60 * 1000, // Reduced for debugging - games stay fresh for 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    onError: (error) => {
      console.error('[useAllGames] Query error:', error);
    },
    onSuccess: (data) => {
      console.log('[useAllGames] Query success:', {
        gameCount: data.length,
        hasCircleId: data.filter(g => g.circleId).length,
        noCircleId: data.filter(g => !g.circleId).length
      });
    }
  });
}

// Circle-aware hook to get recent games with caching
export function useRecentGames(count: number = 5) {
  const { selectedCircleId } = useCircles();
  
  const circleId = selectedCircleId === 'all' ? undefined : selectedCircleId;
  
  return useQuery({
    queryKey: gameKeys.recent(count, circleId),
    queryFn: () => getRecentGames(count, circleId),
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
    invalidateAllGames: () => queryClient.invalidateQueries({ queryKey: gameKeys.allGames() }),
    invalidateRecent: () => queryClient.invalidateQueries({ queryKey: gameKeys.recent() }),
    invalidatePlayerGames: (playerId: string) =>
      queryClient.invalidateQueries({ queryKey: gameKeys.player(playerId) }),
    invalidateCount: () => queryClient.invalidateQueries({ queryKey: gameKeys.count() }),
    // Add refetch methods that return promises
    refetchAll: () => queryClient.refetchQueries({ queryKey: gameKeys.all }),
    refetchAllGames: () => queryClient.refetchQueries({ queryKey: gameKeys.allGames() }),
    // Force clear all game-related cache and refetch
    clearAndRefetch: () => {
      console.log('[useInvalidateGames] Clearing all game caches and forcing refetch');
      queryClient.removeQueries({ queryKey: gameKeys.all });
      return queryClient.refetchQueries({ queryKey: gameKeys.all });
    },
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

// Helper hook for partnership calculations
export function usePartnershipsData() {
  const allGamesQuery = useAllGames();
  const playersQuery = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
    staleTime: 10 * 1000,
  });

  return {
    games: allGamesQuery.data || [],
    players: playersQuery.data || [],
    isLoading: allGamesQuery.isLoading || playersQuery.isLoading,
    error: allGamesQuery.error || playersQuery.error,
    refetch: () => {
      allGamesQuery.refetch();
      playersQuery.refetch();
    },
  };
}

// Query keys for tournaments
export const tournamentKeys = {
  all: ['tournaments'] as const,
  lists: () => [...tournamentKeys.all, 'list'] as const,
  allTournaments: () => [...tournamentKeys.lists(), 'all'] as const,
  status: (status: Tournament['status']) => [...tournamentKeys.lists(), 'status', status] as const,
};

// Hook to get all tournaments with caching
export function useAllTournaments() {
  return useQuery({
    queryKey: tournamentKeys.allTournaments(),
    queryFn: getTournaments,
    staleTime: 2 * 60 * 1000, // Tournaments stay fresh for 2 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook to get tournaments by status
export function useTournamentsByStatus(status: Tournament['status']) {
  return useQuery({
    queryKey: tournamentKeys.status(status),
    queryFn: () => getTournamentsByStatus(status),
    staleTime: 1 * 60 * 1000, // Status-specific tournaments stay fresh for 1 minute
    refetchOnWindowFocus: true,
  });
}

// Hook to invalidate tournament-related queries after mutations
export function useInvalidateTournaments() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: tournamentKeys.all }),
    invalidateAllTournaments: () => queryClient.invalidateQueries({ queryKey: tournamentKeys.allTournaments() }),
    invalidateByStatus: (status: Tournament['status']) =>
      queryClient.invalidateQueries({ queryKey: tournamentKeys.status(status) }),
    // Add refetch methods that return promises
    refetchAll: () => queryClient.refetchQueries({ queryKey: tournamentKeys.all }),
    refetchAllTournaments: () => queryClient.refetchQueries({ queryKey: tournamentKeys.allTournaments() }),
  };
}