'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, addHours } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RecurringEventDialog } from '@/components/events/recurring-event-dialog';
import { useEvent, useUpdateEvent } from '@/hooks/use-events';
import { useToast } from '@/hooks/use-toast';
import { useClub } from '@/contexts/club-context';
import { useAuth } from '@/contexts/auth-context';
import { AlertTriangle, ArrowLeft, Loader2, Save } from 'lucide-react';
import type { Event } from '@/lib/types';

const editEventFormSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(100),
    description: z.string().max(1000).optional(),
    type: z.enum(['training', 'league_match', 'friendly', 'other']),
    customType: z.string().max(50).optional(),
    startDate: z.string().min(1, 'Start date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    location: z.string().max(200).optional(),
    status: z.enum(['scheduled', 'cancelled']),
  })
  .refine(
    (data) => {
      if (data.type === 'other') {
        return data.customType && data.customType.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Custom type is required when event type is "other"',
      path: ['customType'],
    }
  )
  .refine(
    (data) => {
      const start = new Date(`${data.startDate}T${data.startTime}`);
      const end = new Date(`${data.startDate}T${data.endTime}`);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

type EditEventFormValues = z.infer<typeof editEventFormSchema>;

interface EditEventFormProps {
  eventId: string;
}

export function EditEventForm({ eventId }: EditEventFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { selectedClub } = useClub();
  const { isClubAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<EditEventFormValues | null>(null);
  const startTimeChangedRef = useRef(false);
  const initialStartTimeRef = useRef<string>('');

  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId);
  const updateMutation = useUpdateEvent();

  const isAdmin = selectedClub?.id ? isClubAdmin(selectedClub.id) : false;

  const form = useForm<EditEventFormValues>({
    resolver: zodResolver(editEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'training',
      customType: '',
      startDate: '',
      startTime: '',
      endTime: '',
      location: '',
      status: 'scheduled',
    },
  });

  // Populate form when event data loads
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.startTime);
      const endDate = new Date(event.endTime);

      const startTimeFormatted = format(startDate, 'HH:mm');
      initialStartTimeRef.current = startTimeFormatted;

      form.reset({
        title: event.title,
        description: event.description || '',
        type: event.type,
        customType: event.customType || '',
        startDate: format(startDate, 'yyyy-MM-dd'),
        startTime: startTimeFormatted,
        endTime: format(endDate, 'HH:mm'),
        location: event.location || '',
        status: event.status,
      });
    }
  }, [event, form]);

  const watchType = form.watch('type');
  const watchStartTime = form.watch('startTime');

  // Auto-update end time to 2 hours after start time (first change only)
  useEffect(() => {
    if (
      !startTimeChangedRef.current &&
      watchStartTime &&
      initialStartTimeRef.current &&
      watchStartTime !== initialStartTimeRef.current
    ) {
      startTimeChangedRef.current = true;
      const [hours, minutes] = watchStartTime.split(':');
      const startDate = new Date();
      startDate.setHours(parseInt(hours), parseInt(minutes));
      const endDate = addHours(startDate, 2);
      form.setValue('endTime', format(endDate, 'HH:mm'));
    }
  }, [watchStartTime, form]);

  const handleSubmit = async (values: EditEventFormValues, updateFuture: boolean = false) => {
    if (!event) return;

    setIsSubmitting(true);

    try {
      const startTime = `${values.startDate}T${values.startTime}:00`;
      const endTime = `${values.startDate}T${values.endTime}:00`;

      await updateMutation.mutateAsync({
        eventId: event.id,
        clubId: event.clubId,
        updates: {
          title: values.title,
          description: values.description,
          type: values.type,
          customType: values.type === 'other' ? values.customType : undefined,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          location: values.location,
          status: values.status,
        },
        updateFuture,
      });

      toast({
        title: 'Event Updated',
        description: updateFuture
          ? 'Event and all future recurring events have been updated.'
          : 'Event has been updated successfully.',
      });

      router.push(`/events/${event.id}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error updating event',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
      setShowRecurringDialog(false);
      setPendingValues(null);
    }
  };

  const onSubmit = (values: EditEventFormValues) => {
    if (event?.isRecurringInstance) {
      setPendingValues(values);
      setShowRecurringDialog(true);
    } else {
      handleSubmit(values, false);
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
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
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

  if (!isAdmin) {
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
            Only club administrators can edit events.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <PageHeader
        title="Edit Event"
        description={`Update the details for "${event.title}".`}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>
                Update the basic information about your event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Weekly Training Session" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add details about the event..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="league_match">League Match</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchType === 'other' && (
                  <FormField
                    control={form.control}
                    name="customType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Social Gathering" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Main Sports Hall" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle>Date & Time</CardTitle>
              <CardDescription>When will the event take place?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) => {
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                        }}
                        placeholder="Select event date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select start time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <TimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select end time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Recurring Edit Dialog */}
      <RecurringEventDialog
        open={showRecurringDialog}
        onOpenChange={setShowRecurringDialog}
        title="Edit Recurring Event"
        description="This is part of a recurring series. Would you like to update just this event or all future events in the series?"
        action="edit"
        onThisOnly={() => pendingValues && handleSubmit(pendingValues, false)}
        onAllFuture={() => pendingValues && handleSubmit(pendingValues, true)}
        isLoading={isSubmitting}
      />
    </>
  );
}
