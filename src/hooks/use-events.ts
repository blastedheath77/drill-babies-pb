import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEvents,
  getUpcomingEvents,
  getPastEvents,
  getEventById,
  getEventRsvps,
  getUserRsvp,
  getUserRsvpsInClub,
  createEvent,
  createRecurringEvents,
  updateEvent,
  updateFutureRecurringEvents,
  deleteEvent,
  deleteFutureRecurringEvents,
  upsertRsvp,
  deleteRsvp,
} from '@/lib/events';
import type { Event, EventRsvp, RsvpResponse } from '@/lib/types';

// Query keys for consistent cache management
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (clubId: string) => [...eventKeys.lists(), clubId] as const,
  upcoming: (clubId: string) => [...eventKeys.all, 'upcoming', clubId] as const,
  past: (clubId: string) => [...eventKeys.all, 'past', clubId] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  rsvps: (eventId: string) => [...eventKeys.all, 'rsvps', eventId] as const,
  userRsvp: (eventId: string, userId: string) => [...eventKeys.all, 'user-rsvp', eventId, userId] as const,
  userRsvpsInClub: (userId: string, clubId: string) => [...eventKeys.all, 'user-rsvps', userId, clubId] as const,
};

// Hook to get all events for a club
export function useEvents(clubId?: string) {
  return useQuery({
    queryKey: eventKeys.list(clubId || ''),
    queryFn: () => getEvents(clubId || ''),
    enabled: !!clubId,
    staleTime: 30 * 1000, // Events list stays fresh for 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

// Hook to get upcoming events for a club
export function useUpcomingEvents(clubId?: string) {
  return useQuery({
    queryKey: eventKeys.upcoming(clubId || ''),
    queryFn: () => getUpcomingEvents(clubId || ''),
    enabled: !!clubId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

// Hook to get past events for a club
export function usePastEvents(clubId?: string) {
  return useQuery({
    queryKey: eventKeys.past(clubId || ''),
    queryFn: () => getPastEvents(clubId || ''),
    enabled: !!clubId,
    staleTime: 60 * 1000, // Past events don't change as often
    refetchOnWindowFocus: true,
  });
}

// Hook to get a single event by ID
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => getEventById(eventId),
    enabled: !!eventId,
    staleTime: 30 * 1000,
  });
}

// Hook to get RSVPs for an event
export function useEventRsvps(eventId: string) {
  return useQuery({
    queryKey: eventKeys.rsvps(eventId),
    queryFn: () => getEventRsvps(eventId),
    enabled: !!eventId,
    staleTime: 10 * 1000, // RSVPs can change frequently
    refetchOnWindowFocus: true,
  });
}

// Hook to get the current user's RSVP for an event
export function useUserRsvp(eventId: string, userId?: string) {
  return useQuery({
    queryKey: eventKeys.userRsvp(eventId, userId || ''),
    queryFn: () => getUserRsvp(eventId, userId || ''),
    enabled: !!eventId && !!userId,
    staleTime: 10 * 1000,
  });
}

// Hook to get all of a user's RSVPs in a club
export function useUserRsvpsInClub(userId?: string, clubId?: string) {
  return useQuery({
    queryKey: eventKeys.userRsvpsInClub(userId || '', clubId || ''),
    queryFn: () => getUserRsvpsInClub(userId || '', clubId || ''),
    enabled: !!userId && !!clubId,
    staleTime: 30 * 1000,
  });
}

// Hook to create an event
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clubId: string;
      title: string;
      description?: string;
      type: Event['type'];
      customType?: string;
      startTime: string;
      endTime: string;
      location?: string;
      createdBy: string;
      isRecurring?: boolean;
      recurrenceEndDate?: string;
    }) => {
      if (data.isRecurring && data.recurrenceEndDate) {
        return createRecurringEvents({
          clubId: data.clubId,
          title: data.title,
          description: data.description,
          type: data.type,
          customType: data.customType,
          startTime: data.startTime,
          endTime: data.endTime,
          location: data.location,
          createdBy: data.createdBy,
          recurrenceEndDate: data.recurrenceEndDate,
        });
      } else {
        const eventId = await createEvent({
          clubId: data.clubId,
          title: data.title,
          description: data.description,
          type: data.type,
          customType: data.customType,
          startTime: data.startTime,
          endTime: data.endTime,
          location: data.location,
          createdBy: data.createdBy,
        });
        return [eventId];
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate events lists for the club
      queryClient.invalidateQueries({ queryKey: eventKeys.list(variables.clubId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming(variables.clubId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.past(variables.clubId) });
    },
  });
}

// Hook to update an event
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      clubId: string;
      updates: Partial<Event>;
      updateFuture?: boolean;
    }) => {
      if (data.updateFuture) {
        await updateFutureRecurringEvents(data.eventId, data.updates);
      } else {
        await updateEvent(data.eventId, data.updates);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate event detail and lists
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.list(variables.clubId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming(variables.clubId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.past(variables.clubId) });
    },
  });
}

// Hook to delete an event
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      clubId: string;
      deleteFuture?: boolean;
    }) => {
      if (data.deleteFuture) {
        await deleteFutureRecurringEvents(data.eventId);
      } else {
        await deleteEvent(data.eventId);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate event detail and lists
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.list(variables.clubId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming(variables.clubId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.past(variables.clubId) });
    },
  });
}

// Hook to RSVP to an event
export function useRsvp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      eventId: string;
      userId: string;
      clubId: string;
      response: RsvpResponse;
    }) => {
      await upsertRsvp(data);
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(variables.eventId) });
      await queryClient.cancelQueries({ queryKey: eventKeys.rsvps(variables.eventId) });
      await queryClient.cancelQueries({ queryKey: eventKeys.userRsvp(variables.eventId, variables.userId) });

      // Snapshot the previous values
      const previousEvent = queryClient.getQueryData<Event>(eventKeys.detail(variables.eventId));
      const previousUserRsvp = queryClient.getQueryData<EventRsvp>(
        eventKeys.userRsvp(variables.eventId, variables.userId)
      );

      // Optimistically update the event RSVP counts
      if (previousEvent) {
        const newRsvpCounts = { ...previousEvent.rsvpCounts };

        // Decrement old response count if there was a previous RSVP
        if (previousUserRsvp) {
          newRsvpCounts[previousUserRsvp.response] = Math.max(
            0,
            newRsvpCounts[previousUserRsvp.response] - 1
          );
        }

        // Increment new response count
        newRsvpCounts[variables.response] = (newRsvpCounts[variables.response] || 0) + 1;

        queryClient.setQueryData<Event>(eventKeys.detail(variables.eventId), {
          ...previousEvent,
          rsvpCounts: newRsvpCounts,
        });
      }

      // Optimistically update user's RSVP
      queryClient.setQueryData<EventRsvp>(
        eventKeys.userRsvp(variables.eventId, variables.userId),
        {
          id: `${variables.eventId}_${variables.userId}`,
          eventId: variables.eventId,
          userId: variables.userId,
          clubId: variables.clubId,
          response: variables.response,
          respondedAt: new Date().toISOString(),
        }
      );

      return { previousEvent, previousUserRsvp };
    },
    onError: (_, variables, context) => {
      // Rollback on error
      if (context?.previousEvent) {
        queryClient.setQueryData(eventKeys.detail(variables.eventId), context.previousEvent);
      }
      if (context?.previousUserRsvp) {
        queryClient.setQueryData(
          eventKeys.userRsvp(variables.eventId, variables.userId),
          context.previousUserRsvp
        );
      } else {
        queryClient.removeQueries({ queryKey: eventKeys.userRsvp(variables.eventId, variables.userId) });
      }
    },
    onSettled: (_, __, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.rsvps(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.userRsvp(variables.eventId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.userRsvpsInClub(variables.userId, variables.clubId) });
    },
  });
}

// Hook to remove an RSVP
export function useRemoveRsvp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { eventId: string; userId: string; clubId: string }) => {
      await deleteRsvp(data.eventId, data.userId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.rsvps(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.userRsvp(variables.eventId, variables.userId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.userRsvpsInClub(variables.userId, variables.clubId) });
    },
  });
}

// Hook to invalidate event-related queries
export function useInvalidateEvents() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
    invalidateList: (clubId: string) => queryClient.invalidateQueries({ queryKey: eventKeys.list(clubId) }),
    invalidateUpcoming: (clubId: string) => queryClient.invalidateQueries({ queryKey: eventKeys.upcoming(clubId) }),
    invalidatePast: (clubId: string) => queryClient.invalidateQueries({ queryKey: eventKeys.past(clubId) }),
    invalidateEvent: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
    invalidateRsvps: (eventId: string) =>
      queryClient.invalidateQueries({ queryKey: eventKeys.rsvps(eventId) }),
    refetchAll: () => queryClient.refetchQueries({ queryKey: eventKeys.all }),
  };
}

// Hook to prefetch an event
export function usePrefetchEvent() {
  const queryClient = useQueryClient();

  return (eventId: string) => {
    queryClient.prefetchQuery({
      queryKey: eventKeys.detail(eventId),
      queryFn: () => getEventById(eventId),
      staleTime: 30 * 1000,
    });
  };
}
