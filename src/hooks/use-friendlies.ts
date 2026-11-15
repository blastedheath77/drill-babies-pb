'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFriendlies, getFriendly } from '@/lib/friendlies';

export const friendlyKeys = {
  all: ['friendlies'] as const,
  list: () => [...friendlyKeys.all, 'list'] as const,
  detail: (id: string) => [...friendlyKeys.all, 'detail', id] as const,
};

export function useFriendlies() {
  return useQuery({ queryKey: friendlyKeys.list(), queryFn: getFriendlies, staleTime: 30 * 1000 });
}

export function useFriendly(id: string) {
  return useQuery({ queryKey: friendlyKeys.detail(id), queryFn: () => getFriendly(id), staleTime: 5 * 1000 });
}

export function useRefreshFriendlies() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: friendlyKeys.all });
}
