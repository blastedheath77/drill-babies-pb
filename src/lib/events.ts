import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Event, EventRsvp, RsvpResponse } from './types';
import { logger } from './logger';
import { logError } from './errors';

const eventsCollection = collection(db, 'events');
const eventRsvpsCollection = collection(db, 'eventRsvps');

// Convert Firestore document to Event object
function documentToEvent(docData: any, id: string): Event {
  return {
    id,
    clubId: docData.clubId,
    title: docData.title,
    description: docData.description,
    type: docData.type,
    customType: docData.customType,
    startTime: docData.startTime instanceof Timestamp
      ? docData.startTime.toDate().toISOString()
      : docData.startTime,
    endTime: docData.endTime instanceof Timestamp
      ? docData.endTime.toDate().toISOString()
      : docData.endTime,
    location: docData.location,
    recurrenceGroupId: docData.recurrenceGroupId,
    isRecurringInstance: docData.isRecurringInstance ?? false,
    recurrenceIndex: docData.recurrenceIndex,
    createdBy: docData.createdBy,
    createdDate: docData.createdDate instanceof Timestamp
      ? docData.createdDate.toDate().toISOString()
      : docData.createdDate,
    rsvpCounts: docData.rsvpCounts || { yes: 0, maybe: 0, no: 0 },
    status: docData.status || 'scheduled',
  };
}

// Convert Firestore document to EventRsvp object
function documentToEventRsvp(docData: any, id: string): EventRsvp {
  return {
    id,
    eventId: docData.eventId,
    userId: docData.userId,
    clubId: docData.clubId,
    response: docData.response,
    respondedAt: docData.respondedAt instanceof Timestamp
      ? docData.respondedAt.toDate().toISOString()
      : docData.respondedAt,
  };
}

/**
 * Get all events for a club
 */
export async function getEvents(clubId: string): Promise<Event[]> {
  try {
    // Try query with orderBy first
    let q = query(
      eventsCollection,
      where('clubId', '==', clubId),
      orderBy('startTime', 'asc')
    );

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firebase request timeout')), 10000);
    });

    let snapshot: any;
    try {
      snapshot = await Promise.race([getDocs(q), timeoutPromise]) as any;
    } catch (indexError: any) {
      // If index error, fall back to query without orderBy and sort client-side
      if (indexError?.code === 'failed-precondition' || indexError?.message?.includes('index')) {
        logger.warn('Index not ready, falling back to client-side sorting for events');
        q = query(eventsCollection, where('clubId', '==', clubId));
        snapshot = await Promise.race([getDocs(q), timeoutPromise]) as any;
      } else {
        throw indexError;
      }
    }

    const events = snapshot.docs.map((doc: any) => documentToEvent(doc.data(), doc.id));

    // Sort by startTime ascending (in case we fell back to simple query)
    return events.sort((a: Event, b: Event) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getEvents');
    return [];
  }
}

/**
 * Get upcoming events for a club (events that haven't ended yet)
 */
export async function getUpcomingEvents(clubId: string): Promise<Event[]> {
  try {
    const events = await getEvents(clubId);
    const now = new Date().toISOString();

    return events.filter(event =>
      event.endTime >= now && event.status === 'scheduled'
    );
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getUpcomingEvents');
    return [];
  }
}

/**
 * Get past events for a club
 */
export async function getPastEvents(clubId: string): Promise<Event[]> {
  try {
    const events = await getEvents(clubId);
    const now = new Date().toISOString();

    return events
      .filter(event => event.endTime < now)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getPastEvents');
    return [];
  }
}

/**
 * Get a specific event by ID
 */
export async function getEventById(id: string): Promise<Event | undefined> {
  try {
    const eventDoc = await getDoc(doc(eventsCollection, id));

    if (!eventDoc.exists()) {
      return undefined;
    }

    return documentToEvent(eventDoc.data(), eventDoc.id);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getEventById');
    return undefined;
  }
}

/**
 * Create a single event
 */
export async function createEvent(data: {
  clubId: string;
  title: string;
  description?: string;
  type: Event['type'];
  customType?: string;
  startTime: string;
  endTime: string;
  location?: string;
  createdBy: string;
}): Promise<string> {
  try {
    const eventData: any = {
      clubId: data.clubId,
      title: data.title,
      description: data.description || '',
      type: data.type,
      startTime: Timestamp.fromDate(new Date(data.startTime)),
      endTime: Timestamp.fromDate(new Date(data.endTime)),
      location: data.location || '',
      isRecurringInstance: false,
      createdBy: data.createdBy,
      createdDate: serverTimestamp(),
      rsvpCounts: { yes: 0, maybe: 0, no: 0 },
      status: 'scheduled',
    };

    // Only include customType if it has a value
    if (data.customType) {
      eventData.customType = data.customType;
    }

    const docRef = await addDoc(eventsCollection, eventData);
    logger.info(`Created event: ${data.title} (${docRef.id})`);

    return docRef.id;
  } catch (error) {
    logger.error('Error creating event:', error);
    throw error;
  }
}

/**
 * Create recurring events (weekly)
 * Generates all instances upfront, limited to 52 instances max
 */
export async function createRecurringEvents(data: {
  clubId: string;
  title: string;
  description?: string;
  type: Event['type'];
  customType?: string;
  startTime: string;
  endTime: string;
  location?: string;
  createdBy: string;
  recurrenceEndDate: string;
}): Promise<string[]> {
  try {
    const MAX_INSTANCES = 52;
    const recurrenceGroupId = `recur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const firstStart = new Date(data.startTime);
    const firstEnd = new Date(data.endTime);
    const recurrenceEnd = new Date(data.recurrenceEndDate);

    // Calculate duration of each event
    const durationMs = firstEnd.getTime() - firstStart.getTime();

    // Generate all instance dates
    const instances: { startTime: Date; endTime: Date; index: number }[] = [];
    let currentStart = new Date(firstStart);
    let index = 0;

    while (currentStart <= recurrenceEnd && index < MAX_INSTANCES) {
      const currentEnd = new Date(currentStart.getTime() + durationMs);
      instances.push({
        startTime: new Date(currentStart),
        endTime: currentEnd,
        index,
      });

      // Move to next week
      currentStart.setDate(currentStart.getDate() + 7);
      index++;
    }

    if (instances.length === 0) {
      throw new Error('No event instances could be created with the given dates');
    }

    // Batch write all instances
    const batch = writeBatch(db);
    const eventIds: string[] = [];

    for (const instance of instances) {
      const eventRef = doc(eventsCollection);
      eventIds.push(eventRef.id);

      const eventData: any = {
        clubId: data.clubId,
        title: data.title,
        description: data.description || '',
        type: data.type,
        startTime: Timestamp.fromDate(instance.startTime),
        endTime: Timestamp.fromDate(instance.endTime),
        location: data.location || '',
        recurrenceGroupId,
        isRecurringInstance: true,
        recurrenceIndex: instance.index,
        createdBy: data.createdBy,
        createdDate: serverTimestamp(),
        rsvpCounts: { yes: 0, maybe: 0, no: 0 },
        status: 'scheduled',
      };

      // Only include customType if it has a value
      if (data.customType) {
        eventData.customType = data.customType;
      }

      batch.set(eventRef, eventData);
    }

    await batch.commit();
    logger.info(`Created ${instances.length} recurring events with group ID: ${recurrenceGroupId}`);

    return eventIds;
  } catch (error) {
    logger.error('Error creating recurring events:', error);
    throw error;
  }
}

/**
 * Update an event
 */
export async function updateEvent(id: string, data: Partial<Event>): Promise<void> {
  try {
    const eventRef = doc(eventsCollection, id);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.customType !== undefined) updateData.customType = data.customType;
    if (data.startTime !== undefined) updateData.startTime = Timestamp.fromDate(new Date(data.startTime));
    if (data.endTime !== undefined) updateData.endTime = Timestamp.fromDate(new Date(data.endTime));
    if (data.location !== undefined) updateData.location = data.location;
    if (data.status !== undefined) updateData.status = data.status;

    await updateDoc(eventRef, updateData);
    logger.info(`Updated event: ${id}`);
  } catch (error) {
    logger.error(`Error updating event ${id}:`, error);
    throw error;
  }
}

/**
 * Update all future recurring events in a series
 */
export async function updateFutureRecurringEvents(
  eventId: string,
  data: Partial<Event>
): Promise<void> {
  try {
    const event = await getEventById(eventId);
    if (!event || !event.recurrenceGroupId) {
      throw new Error('Event not found or is not a recurring event');
    }

    // Get all events in the same recurrence group
    const q = query(
      eventsCollection,
      where('recurrenceGroupId', '==', event.recurrenceGroupId)
    );
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    const currentEventStart = new Date(event.startTime);

    snapshot.docs.forEach((docSnapshot) => {
      const eventData = documentToEvent(docSnapshot.data(), docSnapshot.id);
      const eventStart = new Date(eventData.startTime);

      // Only update events that start at or after the current event
      if (eventStart >= currentEventStart) {
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.customType !== undefined) updateData.customType = data.customType;
        if (data.location !== undefined) updateData.location = data.location;

        batch.update(doc(eventsCollection, docSnapshot.id), updateData);
      }
    });

    await batch.commit();
    logger.info(`Updated future recurring events for group: ${event.recurrenceGroupId}`);
  } catch (error) {
    logger.error('Error updating future recurring events:', error);
    throw error;
  }
}

/**
 * Delete an event and all its RSVPs
 */
export async function deleteEvent(id: string): Promise<void> {
  try {
    // Get all RSVPs for this event
    const rsvpsQuery = query(eventRsvpsCollection, where('eventId', '==', id));
    const rsvpsSnapshot = await getDocs(rsvpsQuery);

    const batch = writeBatch(db);

    // Delete all RSVPs
    rsvpsSnapshot.docs.forEach((rsvpDoc) => {
      batch.delete(doc(eventRsvpsCollection, rsvpDoc.id));
    });

    // Delete the event
    batch.delete(doc(eventsCollection, id));

    await batch.commit();
    logger.info(`Deleted event ${id} and ${rsvpsSnapshot.size} RSVPs`);
  } catch (error) {
    logger.error(`Error deleting event ${id}:`, error);
    throw error;
  }
}

/**
 * Delete all future recurring events in a series
 */
export async function deleteFutureRecurringEvents(eventId: string): Promise<void> {
  try {
    const event = await getEventById(eventId);
    if (!event || !event.recurrenceGroupId) {
      throw new Error('Event not found or is not a recurring event');
    }

    // Get all events in the same recurrence group
    const eventsQuery = query(
      eventsCollection,
      where('recurrenceGroupId', '==', event.recurrenceGroupId)
    );
    const eventsSnapshot = await getDocs(eventsQuery);

    const batch = writeBatch(db);
    const currentEventStart = new Date(event.startTime);
    const eventIdsToDelete: string[] = [];

    eventsSnapshot.docs.forEach((docSnapshot) => {
      const eventData = documentToEvent(docSnapshot.data(), docSnapshot.id);
      const eventStart = new Date(eventData.startTime);

      // Only delete events that start at or after the current event
      if (eventStart >= currentEventStart) {
        eventIdsToDelete.push(docSnapshot.id);
        batch.delete(doc(eventsCollection, docSnapshot.id));
      }
    });

    // Get and delete RSVPs for all events being deleted
    for (const eventIdToDelete of eventIdsToDelete) {
      const rsvpsQuery = query(eventRsvpsCollection, where('eventId', '==', eventIdToDelete));
      const rsvpsSnapshot = await getDocs(rsvpsQuery);

      rsvpsSnapshot.docs.forEach((rsvpDoc) => {
        batch.delete(doc(eventRsvpsCollection, rsvpDoc.id));
      });
    }

    await batch.commit();
    logger.info(`Deleted ${eventIdsToDelete.length} future recurring events for group: ${event.recurrenceGroupId}`);
  } catch (error) {
    logger.error('Error deleting future recurring events:', error);
    throw error;
  }
}

/**
 * Get RSVPs for an event
 */
export async function getEventRsvps(eventId: string): Promise<EventRsvp[]> {
  try {
    const q = query(eventRsvpsCollection, where('eventId', '==', eventId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => documentToEventRsvp(doc.data(), doc.id));
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getEventRsvps');
    return [];
  }
}

/**
 * Get a user's RSVP for an event
 */
export async function getUserRsvp(eventId: string, userId: string): Promise<EventRsvp | undefined> {
  try {
    const rsvpId = `${eventId}_${userId}`;
    const rsvpDoc = await getDoc(doc(eventRsvpsCollection, rsvpId));

    if (!rsvpDoc.exists()) {
      return undefined;
    }

    return documentToEventRsvp(rsvpDoc.data(), rsvpDoc.id);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getUserRsvp');
    return undefined;
  }
}

/**
 * Get all RSVPs for a user in a club
 */
export async function getUserRsvpsInClub(userId: string, clubId: string): Promise<EventRsvp[]> {
  try {
    const q = query(
      eventRsvpsCollection,
      where('userId', '==', userId),
      where('clubId', '==', clubId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => documentToEventRsvp(doc.data(), doc.id));
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getUserRsvpsInClub');
    return [];
  }
}

/**
 * Create or update an RSVP (atomic operation with count update)
 */
export async function upsertRsvp(data: {
  eventId: string;
  userId: string;
  clubId: string;
  response: RsvpResponse;
}): Promise<void> {
  try {
    const rsvpId = `${data.eventId}_${data.userId}`;

    await runTransaction(db, async (transaction) => {
      const eventRef = doc(eventsCollection, data.eventId);
      const rsvpRef = doc(eventRsvpsCollection, rsvpId);

      const eventDoc = await transaction.get(eventRef);
      const existingRsvpDoc = await transaction.get(rsvpRef);

      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();
      const rsvpCounts = eventData.rsvpCounts || { yes: 0, maybe: 0, no: 0 };

      // If updating existing RSVP, decrement old response count
      if (existingRsvpDoc.exists()) {
        const oldResponse = existingRsvpDoc.data().response as RsvpResponse;
        if (oldResponse !== data.response) {
          rsvpCounts[oldResponse] = Math.max(0, (rsvpCounts[oldResponse] || 0) - 1);
        }
      }

      // Increment new response count (only if different from old or new RSVP)
      if (!existingRsvpDoc.exists() || existingRsvpDoc.data().response !== data.response) {
        rsvpCounts[data.response] = (rsvpCounts[data.response] || 0) + 1;
      }

      // Update event counts
      transaction.update(eventRef, { rsvpCounts });

      // Create or update RSVP
      transaction.set(rsvpRef, {
        eventId: data.eventId,
        userId: data.userId,
        clubId: data.clubId,
        response: data.response,
        respondedAt: serverTimestamp(),
      });
    });

    logger.info(`RSVP updated for event ${data.eventId} by user ${data.userId}: ${data.response}`);
  } catch (error) {
    logger.error('Error upserting RSVP:', error);
    throw error;
  }
}

/**
 * Delete an RSVP (atomic operation with count update)
 */
export async function deleteRsvp(eventId: string, userId: string): Promise<void> {
  try {
    const rsvpId = `${eventId}_${userId}`;

    await runTransaction(db, async (transaction) => {
      const eventRef = doc(eventsCollection, eventId);
      const rsvpRef = doc(eventRsvpsCollection, rsvpId);

      const eventDoc = await transaction.get(eventRef);
      const rsvpDoc = await transaction.get(rsvpRef);

      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      if (!rsvpDoc.exists()) {
        // RSVP doesn't exist, nothing to delete
        return;
      }

      const eventData = eventDoc.data();
      const rsvpData = rsvpDoc.data();
      const rsvpCounts = eventData.rsvpCounts || { yes: 0, maybe: 0, no: 0 };
      const oldResponse = rsvpData.response as RsvpResponse;

      // Decrement old response count
      rsvpCounts[oldResponse] = Math.max(0, (rsvpCounts[oldResponse] || 0) - 1);

      // Update event counts
      transaction.update(eventRef, { rsvpCounts });

      // Delete RSVP
      transaction.delete(rsvpRef);
    });

    logger.info(`RSVP deleted for event ${eventId} by user ${userId}`);
  } catch (error) {
    logger.error('Error deleting RSVP:', error);
    throw error;
  }
}

/**
 * Get events by recurrence group
 */
export async function getEventsByRecurrenceGroup(recurrenceGroupId: string): Promise<Event[]> {
  try {
    const q = query(
      eventsCollection,
      where('recurrenceGroupId', '==', recurrenceGroupId)
    );
    const snapshot = await getDocs(q);

    const events = snapshot.docs.map((doc) => documentToEvent(doc.data(), doc.id));

    // Sort by recurrence index
    return events.sort((a, b) => (a.recurrenceIndex || 0) - (b.recurrenceIndex || 0));
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), 'getEventsByRecurrenceGroup');
    return [];
  }
}
