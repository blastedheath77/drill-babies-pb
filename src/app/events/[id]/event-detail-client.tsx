'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isPast } from 'date-fns';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EventTypeBadge, RsvpButtons, RsvpList } from '@/components/events';
import { RecurringEventDialog, DeleteEventDialog } from '@/components/events/recurring-event-dialog';
import { useEvent, useEventRsvps, useUserRsvp, useRsvp, useDeleteEvent } from '@/hooks/use-events';
import { useAuth } from '@/contexts/auth-context';
import { useClub } from '@/contexts/club-context';
import { useToast } from '@/hooks/use-toast';
import { getUserDocument } from '@/lib/user-management';
import {
  Calendar,
  Clock,
  MapPin,
  Repeat,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Users,
} from 'lucide-react';
import type { RsvpResponse } from '@/lib/types';

interface EventDetailClientProps {
  eventId: string;
}

export function EventDetailClient({ eventId }: EventDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { selectedClub } = useClub();
  const { user, isClubAdmin } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRecurringDeleteDialog, setShowRecurringDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());

  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId);
  const { data: rsvps, isLoading: rsvpsLoading } = useEventRsvps(eventId);
  const { data: userRsvp } = useUserRsvp(eventId, user?.id);
  const rsvpMutation = useRsvp();
  const deleteMutation = useDeleteEvent();

  // Fetch user names for RSVPs
  useEffect(() => {
    async function fetchUserNames() {
      if (!rsvps || rsvps.length === 0) {
        setUserNames(new Map());
        return;
      }

      const uniqueUserIds = [...new Set(rsvps.map((rsvp) => rsvp.userId))];
      const names = new Map<string, string>();

      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          try {
            const userDoc = await getUserDocument(userId);
            if (userDoc) {
              names.set(userId, userDoc.name);
            }
          } catch (error) {
            console.error(`Failed to fetch user ${userId}:`, error);
          }
        })
      );

      setUserNames(names);
    }

    fetchUserNames();
  }, [rsvps]);

  const isAdmin = selectedClub?.id ? isClubAdmin(selectedClub.id) : false;
  const eventIsPast = event ? isPast(new Date(event.endTime)) : false;
  const isCancelled = event?.status === 'cancelled';
  const canRsvp = !eventIsPast && !isCancelled && user;

  const handleRsvp = async (response: RsvpResponse) => {
    if (!user || !event) return;

    try {
      await rsvpMutation.mutateAsync({
        eventId: event.id,
        userId: user.id,
        clubId: event.clubId,
        response,
      });

      toast({
        title: 'RSVP Updated',
        description: `You have responded "${response}" to this event.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update RSVP',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const handleDelete = async (deleteFuture: boolean = false) => {
    if (!event) return;

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({
        eventId: event.id,
        clubId: event.clubId,
        deleteFuture,
      });

      toast({
        title: 'Event Deleted',
        description: deleteFuture
          ? 'Event and all future recurring events have been deleted.'
          : 'Event has been deleted.',
      });

      router.push('/events');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete event',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setShowRecurringDeleteDialog(false);
    }
  };

  const handleDeleteClick = () => {
    if (event?.isRecurringInstance) {
      setShowRecurringDeleteDialog(true);
    } else {
      setShowDeleteDialog(true);
    }
  };

  if (eventLoading) {
    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </>
    );
  }

  if (eventError || !event) {
    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {eventError?.message || 'Event not found. It may have been deleted.'}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <EventTypeBadge type={event.type} customType={event.customType} />
                {event.isRecurringInstance && (
                  <Badge variant="outline">
                    <Repeat className="h-3 w-3 mr-1" />
                    Recurring
                  </Badge>
                )}
                {isCancelled && (
                  <Badge variant="destructive">Cancelled</Badge>
                )}
                {eventIsPast && !isCancelled && (
                  <Badge variant="secondary">Past Event</Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{event.title}</CardTitle>
              {event.description && (
                <CardDescription className="text-base mt-2">
                  {event.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                    {format(startDate, 'yyyy-MM-dd') !== format(endDate, 'yyyy-MM-dd') && (
                      <p className="text-sm text-muted-foreground">
                        to {format(endDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium">
                      {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                    </p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <p className="font-medium">{event.location}</p>
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Link href={`/events/${event.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleDeleteClick}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* RSVP Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Response
              </CardTitle>
              <CardDescription>
                {canRsvp
                  ? 'Let others know if you can attend this event.'
                  : eventIsPast
                    ? 'This event has already passed.'
                    : isCancelled
                      ? 'This event has been cancelled.'
                      : 'Sign in to respond to this event.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canRsvp ? (
                <RsvpButtons
                  currentResponse={userRsvp?.response}
                  onRsvp={handleRsvp}
                  isLoading={rsvpMutation.isPending}
                />
              ) : (
                <p className="text-muted-foreground">
                  {!user
                    ? 'Please sign in to RSVP to this event.'
                    : eventIsPast
                      ? 'RSVPs are closed for past events.'
                      : 'RSVPs are not available for this event.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Attendees */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendees
              </CardTitle>
              <CardDescription>
                {event.rsvpCounts.yes} going, {event.rsvpCounts.maybe} maybe,{' '}
                {event.rsvpCounts.no} not going
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rsvpsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <RsvpList rsvps={rsvps || []} userNames={userNames} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialogs */}
      <DeleteEventDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        eventTitle={event.title}
        onConfirm={() => handleDelete(false)}
        isLoading={isDeleting}
      />

      <RecurringEventDialog
        open={showRecurringDeleteDialog}
        onOpenChange={setShowRecurringDeleteDialog}
        title="Delete Recurring Event"
        description="This is part of a recurring series. Would you like to delete just this event or all future events in the series?"
        action="delete"
        onThisOnly={() => handleDelete(false)}
        onAllFuture={() => handleDelete(true)}
        isLoading={isDeleting}
      />
    </>
  );
}
