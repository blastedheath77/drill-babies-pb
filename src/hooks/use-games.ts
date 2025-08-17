import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecentGames, getGamesForPlayer, getTotalGamesCount, getAllGames, getPlayers, getTournamentsByStatus, getTournaments } from '@/lib/data';
import type { Game, Tournament } from '@/lib/types';

// Query keys for games
export const gameKeys = {
  all: ['games'] as const,
  lists: () => [...gameKeys.all, 'list'] as const,
  allGames: () => [...gameKeys.lists(), 'all'] as const,
  recent: (count?: number) => [...gameKeys.lists(), 'recent', count] as const,
  player: (playerId: string) => [...gameKeys.lists(), 'player', playerId] as const,
  count: () => [...gameKeys.all, 'count'] as const,
};

// Hook to get all games with caching
export function useAllGames() {
  return useQuery({
    queryKey: gameKeys.allGames(),
    queryFn: getAllGames,
    staleTime: 5 * 60 * 1000, // All games stay fresh for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

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
    invalidateAllGames: () => queryClient.invalidateQueries({ queryKey: gameKeys.allGames() }),
    invalidateRecent: () => queryClient.invalidateQueries({ queryKey: gameKeys.recent() }),
    invalidatePlayerGames: (playerId: string) =>
      queryClient.invalidateQueries({ queryKey: gameKeys.player(playerId) }),
    invalidateCount: () => queryClient.invalidateQueries({ queryKey: gameKeys.count() }),
    // Add refetch methods that return promises
    refetchAll: () => queryClient.refetchQueries({ queryKey: gameKeys.all }),
    refetchAllGames: () => queryClient.refetchQueries({ queryKey: gameKeys.allGames() }),
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