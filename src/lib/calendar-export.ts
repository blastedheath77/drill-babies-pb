import { format, parseISO } from 'date-fns';
import type { Event } from './types';

/**
 * Formats a date to iCalendar format (YYYYMMDDTHHMMSSZ in UTC)
 */
function formatICSDate(isoDate: string): string {
  const date = parseISO(isoDate);
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Escapes special characters in iCalendar text fields
 * Commas, semicolons, and backslashes must be escaped
 * Newlines are converted to \n
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Folds long lines at 75 characters as per RFC 5545
 * Continuation lines start with a space
 */
function foldLine(line: string): string {
  if (line.length <= 75) {
    return line;
  }

  const lines: string[] = [];
  let currentLine = line;

  while (currentLine.length > 75) {
    lines.push(currentLine.substring(0, 75));
    currentLine = ' ' + currentLine.substring(75);
  }
  lines.push(currentLine);

  return lines.join('\r\n');
}

/**
 * Converts an Event to iCalendar (.ics) format string
 */
export function eventToICS(event: Event): string {
  const startDate = formatICSDate(event.startTime);
  const endDate = formatICSDate(event.endTime);
  const createdDate = formatICSDate(event.createdDate);

  // Build description with event type
  let description = '';
  if (event.type === 'other' && event.customType) {
    description = `Type: ${event.customType}`;
  } else {
    const typeLabels = {
      training: 'Training Session',
      league_match: 'League Match',
      friendly: 'Friendly Match',
      other: 'Event'
    };
    description = `Type: ${typeLabels[event.type] || 'Event'}`;
  }

  if (event.description) {
    description += `\\n\\n${escapeICSText(event.description)}`;
  }

  // Build location string
  const location = event.location ? escapeICSText(event.location) : '';

  // Determine status
  const status = event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED';

  // Build the ICS content
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PBstats//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@pbstats.app`,
    `DTSTAMP:${createdDate}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DESCRIPTION:${description}`,
  ];

  if (location) {
    lines.push(`LOCATION:${location}`);
  }

  lines.push(
    `STATUS:${status}`,
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  // Fold long lines and join with CRLF
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/**
 * Triggers browser download of ICS file
 */
export function downloadICS(event: Event, filename?: string): void {
  const icsContent = eventToICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates Google Calendar add event URL
 */
export function getGoogleCalendarUrl(event: Event): string {
  const startDate = parseISO(event.startTime);
  const endDate = parseISO(event.endTime);

  // Google Calendar uses YYYYMMDDTHHMMSSZ format
  const dates = `${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}/${format(endDate, "yyyyMMdd'T'HHmmss'Z'")}`;

  // Build description
  let description = '';
  if (event.type === 'other' && event.customType) {
    description = `Type: ${event.customType}`;
  } else {
    const typeLabels = {
      training: 'Training Session',
      league_match: 'League Match',
      friendly: 'Friendly Match',
      other: 'Event'
    };
    description = `Type: ${typeLabels[event.type] || 'Event'}`;
  }

  if (event.description) {
    description += `\n\n${event.description}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: dates,
    details: description,
  });

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates Outlook web add event URL
 */
export function getOutlookCalendarUrl(event: Event): string {
  const startDate = parseISO(event.startTime);
  const endDate = parseISO(event.endTime);

  // Outlook uses ISO 8601 format
  const startdt = startDate.toISOString();
  const enddt = endDate.toISOString();

  // Build body
  let body = '';
  if (event.type === 'other' && event.customType) {
    body = `Type: ${event.customType}`;
  } else {
    const typeLabels = {
      training: 'Training Session',
      league_match: 'League Match',
      friendly: 'Friendly Match',
      other: 'Event'
    };
    body = `Type: ${typeLabels[event.type] || 'Event'}`;
  }

  if (event.description) {
    body += `\n\n${event.description}`;
  }

  const params = new URLSearchParams({
    subject: event.title,
    startdt: startdt,
    enddt: enddt,
    body: body,
  });

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export type CalendarPreference = 'google' | 'ics' | 'outlook' | 'none';

export const CALENDAR_PREFERENCE_KEY = 'pbstats-calendar-preference';

export function getCalendarPreference(): CalendarPreference | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CALENDAR_PREFERENCE_KEY) as CalendarPreference | null;
}

export function setCalendarPreference(preference: CalendarPreference): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CALENDAR_PREFERENCE_KEY, preference);
}

/**
 * Adds an event to the user's preferred calendar app
 */
export function addEventToCalendar(event: Event, preference: CalendarPreference): void {
  switch (preference) {
    case 'google':
      window.open(getGoogleCalendarUrl(event), '_blank');
      break;
    case 'ics':
      downloadICS(event);
      break;
    case 'outlook':
      window.open(getOutlookCalendarUrl(event), '_blank');
      break;
    case 'none':
      break;
  }
}
