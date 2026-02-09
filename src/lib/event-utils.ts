import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import type { Event, RsvpResponse } from '@/lib/types';

/**
 * Format a date to a standardized key for map lookups (yyyy-MM-dd)
 */
export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Group events by date key, handling multi-day events that span multiple days
 */
export function buildEventDateMap(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();

  events.forEach((event) => {
    const start = startOfDay(parseISO(event.startTime));
    const end = startOfDay(parseISO(event.endTime));
    const dates = eachDayOfInterval({ start, end });

    dates.forEach((date) => {
      const key = formatDateKey(date);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    });
  });

  return map;
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(
  date: Date,
  eventsByDate: Map<string, Event[]>
): Event[] {
  const key = formatDateKey(date);
  return eventsByDate.get(key) || [];
}

/**
 * Get all dates that an event spans (for multi-day events)
 */
export function getEventDateRange(event: Event): Date[] {
  const start = startOfDay(parseISO(event.startTime));
  const end = startOfDay(parseISO(event.endTime));
  return eachDayOfInterval({ start, end });
}

/**
 * Determine the dominant RSVP color for a day with multiple events
 * Priority order: unanswered > no > maybe > yes
 * This ensures days with unanswered events are highlighted first to encourage responses
 */
export function getDominantRsvpColor(
  eventsOnDay: Event[],
  userRsvps: Map<string, RsvpResponse>
): 'unanswered' | 'no' | 'maybe' | 'yes' {
  const rsvpStatuses = eventsOnDay.map(
    (event) => userRsvps.get(event.id) || 'unanswered'
  );

  // Priority: unanswered > no > maybe > yes
  if (rsvpStatuses.includes('unanswered')) return 'unanswered';
  if (rsvpStatuses.includes('no')) return 'no';
  if (rsvpStatuses.includes('maybe')) return 'maybe';
  return 'yes';
}

/**
 * Get the CSS class for a given RSVP color
 */
export function getRsvpColorClass(color: 'unanswered' | 'no' | 'maybe' | 'yes'): string {
  const colorMap = {
    yes: 'bg-green-500',
    maybe: 'bg-orange-500',
    no: 'bg-red-500',
    unanswered: 'bg-white border border-gray-300',
  };
  return colorMap[color];
}
