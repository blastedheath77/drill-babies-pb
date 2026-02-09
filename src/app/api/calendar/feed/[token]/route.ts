import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateICSFeed } from '@/lib/calendar-export';
import type { Event, EventRsvp } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Validates a subscription token and returns the associated userId
 * Server-side version using Admin SDK
 */
async function validateToken(token: string): Promise<string | null> {
  try {
    const usersSnapshot = await adminDb
      .collection('users')
      .where('calendarSubscriptionToken', '==', token)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return null;
    }

    return usersSnapshot.docs[0].id;
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
}

/**
 * Converts Firestore timestamp to ISO string
 */
function timestampToISO(timestamp: any): string {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
}

/**
 * GET /api/calendar/feed/[token]
 * Returns an ICS calendar feed containing all events the user has RSVP'd "Yes" to
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    if (!token) {
      return new NextResponse('Missing token', { status: 400 });
    }

    // Validate token and get userId
    const userId = await validateToken(token);

    if (!userId) {
      return new NextResponse('Invalid token', { status: 401 });
    }

    console.log(`Calendar feed requested by user ${userId}`);

    // Get all user's RSVPs with response "yes"
    const rsvpsSnapshot = await adminDb
      .collection('eventRsvps')
      .where('userId', '==', userId)
      .where('response', '==', 'yes')
      .get();

    // Extract event IDs
    const eventIds = rsvpsSnapshot.docs.map(doc => doc.data().eventId);

    if (eventIds.length === 0) {
      // Return empty calendar feed
      const emptyFeed = generateICSFeed([], 'PBStats Events');
      return new NextResponse(emptyFeed, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Content-Disposition': 'inline; filename="pbstats-events.ics"',
        },
      });
    }

    // Fetch all events (filter out cancelled ones)
    const events: Event[] = [];

    for (const eventId of eventIds) {
      const eventDoc = await adminDb.collection('events').doc(eventId).get();

      if (eventDoc.exists) {
        const eventData = eventDoc.data();

        // Skip cancelled events
        if (eventData?.status === 'cancelled') {
          continue;
        }

        // Convert to Event type
        const event: Event = {
          id: eventDoc.id,
          clubId: eventData!.clubId,
          title: eventData!.title,
          description: eventData!.description || '',
          type: eventData!.type,
          customType: eventData!.customType,
          startTime: timestampToISO(eventData!.startTime),
          endTime: timestampToISO(eventData!.endTime),
          location: eventData!.location || '',
          recurrenceGroupId: eventData!.recurrenceGroupId,
          isRecurringInstance: eventData!.isRecurringInstance ?? false,
          recurrenceIndex: eventData!.recurrenceIndex,
          createdBy: eventData!.createdBy,
          createdDate: timestampToISO(eventData!.createdDate),
          rsvpCounts: eventData!.rsvpCounts || { yes: 0, maybe: 0, no: 0 },
          status: eventData!.status || 'scheduled',
        };

        events.push(event);
      }
    }

    // Generate ICS feed
    const icsFeed = generateICSFeed(events, 'PBStats Events');

    return new NextResponse(icsFeed, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Content-Disposition': 'inline; filename="pbstats-events.ics"',
      },
    });
  } catch (error) {
    console.error('Error generating calendar feed:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
