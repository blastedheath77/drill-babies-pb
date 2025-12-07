import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClubs,
  getClubById,
  getClubsForUser,
  createClub,
  updateClub,
  deleteClub,
  addUserToClub,
  removeUserFromClub,
} from '@/lib/clubs';
import type { Club } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Query key factory for clubs
export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filters?: any) => [...clubKeys.lists(), filters] as const,
  details: () => [...clubKeys.all, 'detail'] as const,
  detail: (id: string) => [...clubKeys.details(), id] as const,
  forUser: (userId: string, clubIds: string[]) =>
    [...clubKeys.all, 'user', userId, clubIds] as const,
};

/**
 * Hook to fetch all clubs
 */
export function useClubs() {
  return useQuery({
    queryKey: clubKeys.lists(),
    queryFn: getClubs,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch a specific club by ID
 */
export function useClub(clubId: string) {
  return useQuery({
    queryKey: clubKeys.detail(clubId),
    queryFn: () => getClubById(clubId),
    enabled: !!clubId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch clubs for a specific user
 */
export function useUserClubs(userId: string, clubIds: string[]) {
  return useQuery({
    queryKey: clubKeys.forUser(userId, clubIds),
    queryFn: () => getClubsForUser(userId, clubIds),
    enabled: !!userId && clubIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new club
 */
export function useCreateClub() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createClub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      toast({
        title: 'Club created',
        description: 'The club has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating club',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a club
 */
export function useUpdateClub() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Club> }) =>
      updateClub(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      queryClient.invalidateQueries({ queryKey: clubKeys.detail(variables.id) });
      toast({
        title: 'Club updated',
        description: 'The club has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating club',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a club (soft delete)
 */
export function useDeleteClub() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (clubId: string) => deleteClub(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      toast({
        title: 'Club deleted',
        description: 'The club has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting club',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to add a user to a club
 */
export function useAddUserToClub() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      userId,
      clubId,
      role,
    }: {
      userId: string;
      clubId: string;
      role: 'club_admin' | 'member';
    }) => addUserToClub(userId, clubId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      toast({
        title: 'User added to club',
        description: 'The user has been added to the club successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding user to club',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to remove a user from a club
 */
export function useRemoveUserFromClub() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, clubId }: { userId: string; clubId: string }) =>
      removeUserFromClub(userId, clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all });
      toast({
        title: 'User removed from club',
        description: 'The user has been removed from the club successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error removing user from club',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
