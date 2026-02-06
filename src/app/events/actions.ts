'use server';

import { revalidatePath } from 'next/cache';
import {
  createEvent,
  createRecurringEvents,
  updateEvent,
  updateFutureRecurringEvents,
  deleteEvent,
  deleteFutureRecurringEvents,
} from '@/lib/events';
import { createEventSchema, updateEventSchema, validateData } from '@/lib/validations';
import { getCurrentUser, requireAuthentication } from '@/lib/server-auth';
import { requirePermission, isClubAdmin } from '@/lib/permissions';
import type { Event } from '@/lib/types';

interface CreateEventInput {
  clubId: string;
  title: string;
  description?: string;
  type: Event['type'];
  customType?: string;
  startTime: string;
  endTime: string;
  location?: string;
  isRecurring?: boolean;
  recurrenceEndDate?: string;
}

export async function createEventAction(values: CreateEventInput) {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  requirePermission(currentUser, 'canCreateEvents');

  // Additional check: must be club admin for the target club
  if (!isClubAdmin(currentUser, values.clubId)) {
    throw new Error('You must be a club admin to create events');
  }

  // Validate the input
  const validatedData = validateData(createEventSchema, values);

  try {
    let eventIds: string[];

    if (validatedData.isRecurring && validatedData.recurrenceEndDate) {
      eventIds = await createRecurringEvents({
        clubId: validatedData.clubId,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        customType: validatedData.customType,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        location: validatedData.location,
        createdBy: currentUser.id,
        recurrenceEndDate: validatedData.recurrenceEndDate,
      });
    } else {
      const eventId = await createEvent({
        clubId: validatedData.clubId,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        customType: validatedData.customType,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        location: validatedData.location,
        createdBy: currentUser.id,
      });
      eventIds = [eventId];
    }

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/events');

    return {
      success: true,
      eventIds,
      message: eventIds.length > 1
        ? `Created ${eventIds.length} recurring events`
        : 'Event created successfully',
    };
  } catch (error) {
    console.error('Error creating event:', error);
    const message = error instanceof Error ? error.message : 'Failed to create event';
    throw new Error(message);
  }
}

interface UpdateEventInput {
  eventId: string;
  clubId: string;
  updates: Partial<Event>;
  updateFuture?: boolean;
}

export async function updateEventAction(values: UpdateEventInput) {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  requirePermission(currentUser, 'canModifyEvents');

  // Additional check: must be club admin for the target club
  if (!isClubAdmin(currentUser, values.clubId)) {
    throw new Error('You must be a club admin to update events');
  }

  // Validate the updates
  const validatedUpdates = validateData(updateEventSchema, values.updates);

  try {
    if (values.updateFuture) {
      await updateFutureRecurringEvents(values.eventId, validatedUpdates);
    } else {
      await updateEvent(values.eventId, validatedUpdates);
    }

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/events');
    revalidatePath(`/events/${values.eventId}`);

    return {
      success: true,
      message: values.updateFuture
        ? 'Event and all future recurring events updated'
        : 'Event updated successfully',
    };
  } catch (error) {
    console.error('Error updating event:', error);
    const message = error instanceof Error ? error.message : 'Failed to update event';
    throw new Error(message);
  }
}

interface DeleteEventInput {
  eventId: string;
  clubId: string;
  deleteFuture?: boolean;
}

export async function deleteEventAction(values: DeleteEventInput) {
  const currentUser = await getCurrentUser();
  requireAuthentication(currentUser);
  requirePermission(currentUser, 'canDeleteEvents');

  // Additional check: must be club admin for the target club
  if (!isClubAdmin(currentUser, values.clubId)) {
    throw new Error('You must be a club admin to delete events');
  }

  try {
    if (values.deleteFuture) {
      await deleteFutureRecurringEvents(values.eventId);
    } else {
      await deleteEvent(values.eventId);
    }

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/events');

    return {
      success: true,
      message: values.deleteFuture
        ? 'Event and all future recurring events deleted'
        : 'Event deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting event:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete event';
    throw new Error(message);
  }
}
