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

/**
 * Generates a multi-event ICS feed for calendar subscriptions
 * This creates a complete calendar feed containing multiple events
 */
export function generateICSFeed(events: Event[], feedName: string = 'PBStats Events'): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PBStats//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${feedName}`,
    'X-WR-TIMEZONE:UTC',
  ].join('\r\n');

  // Extract VEVENT blocks from individual event ICS files
  const eventBlocks = events
    .map(event => {
      const fullICS = eventToICS(event);
      // Extract just the VEVENT block (between BEGIN:VEVENT and END:VEVENT)
      const veventMatch = fullICS.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
      return veventMatch ? veventMatch[0] : '';
    })
    .filter(Boolean); // Remove empty strings

  const footer = 'END:VCALENDAR';

  return [header, ...eventBlocks, footer].join('\r\n') + '\r\n';
}
