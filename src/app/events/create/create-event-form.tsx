'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, addHours, addWeeks } from 'date-fns';

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
  FormDescription,
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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useClub } from '@/contexts/club-context';
import { useAuth } from '@/contexts/auth-context';
import { createEventAction } from '../actions';
import { useQueryClient } from '@tanstack/react-query';
import { eventKeys } from '@/hooks/use-events';
import { AlertTriangle, CalendarPlus, Repeat, Loader2 } from 'lucide-react';
import { differenceInWeeks } from 'date-fns';

const createEventFormSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(100),
    description: z.string().max(1000).optional(),
    type: z.enum(['training', 'league_match', 'friendly', 'other']),
    customType: z.string().max(50).optional(),
    startDate: z.string().min(1, 'Start date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    location: z.string().max(200).optional(),
    isRecurring: z.boolean().default(false),
    recurrenceEndDate: z.string().optional(),
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
  )
  .refine(
    (data) => {
      if (data.isRecurring) {
        return data.recurrenceEndDate && data.recurrenceEndDate.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Recurrence end date is required for recurring events',
      path: ['recurrenceEndDate'],
    }
  );

type CreateEventFormValues = z.infer<typeof createEventFormSchema>;

export function CreateEventForm() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();
  const { isClubAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeChangedRef = useRef(false);

  const isAdmin = selectedClub?.id ? isClubAdmin(selectedClub.id) : false;

  // Default to tomorrow at 6 PM, 2 hour duration
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStartDate = format(tomorrow, 'yyyy-MM-dd');
  const defaultStartTime = '18:00';
  const defaultEndTime = '20:00';

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'training',
      customType: '',
      startDate: defaultStartDate,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      location: '',
      isRecurring: false,
      recurrenceEndDate: '',
    },
  });

  const watchType = form.watch('type');
  const watchIsRecurring = form.watch('isRecurring');
  const watchStartDate = form.watch('startDate');
  const watchStartTime = form.watch('startTime');
  const watchRecurrenceEndDate = form.watch('recurrenceEndDate');

  // Auto-update end time to 2 hours after start time (first change only)
  useEffect(() => {
    if (!startTimeChangedRef.current && watchStartTime && watchStartTime !== defaultStartTime) {
      startTimeChangedRef.current = true;
      const [hours, minutes] = watchStartTime.split(':');
      const startDate = new Date();
      startDate.setHours(parseInt(hours), parseInt(minutes));
      const endDate = addHours(startDate, 2);
      form.setValue('endTime', format(endDate, 'HH:mm'));
    }
  }, [watchStartTime, form]);

  // Calculate number of recurring instances for preview
  const getRecurringInstanceCount = () => {
    if (!watchIsRecurring || !watchStartDate || !watchRecurrenceEndDate) return 0;
    const start = new Date(watchStartDate);
    const end = new Date(watchRecurrenceEndDate);
    const weeks = differenceInWeeks(end, start);
    return Math.min(Math.max(0, weeks + 1), 3);
  };

  const recurringCount = getRecurringInstanceCount();

  async function onSubmit(values: CreateEventFormValues) {
    if (!selectedClub?.id) {
      toast({
        variant: 'destructive',
        title: 'No Club Selected',
        description: 'Please select a club before creating an event.',
      });
      return;
    }

    if (!isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Only club admins can create events.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const startTime = `${values.startDate}T${values.startTime}:00`;
      const endTime = `${values.startDate}T${values.endTime}:00`;

      await createEventAction({
        clubId: selectedClub.id,
        title: values.title,
        description: values.description,
        type: values.type,
        customType: values.type === 'other' ? values.customType : undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        location: values.location,
        isRecurring: values.isRecurring,
        recurrenceEndDate: values.isRecurring && values.recurrenceEndDate
          ? new Date(`${values.recurrenceEndDate}T23:59:59`).toISOString()
          : undefined,
      });

      // Invalidate React Query cache to refresh the events list
      queryClient.invalidateQueries({ queryKey: eventKeys.upcoming(selectedClub.id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.past(selectedClub.id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.list(selectedClub.id) });

      toast({
        title: 'Event Created!',
        description: values.isRecurring
          ? `Created ${recurringCount} recurring events.`
          : `"${values.title}" has been created.`,
      });

      router.push('/events');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error creating event',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <>
        <PageHeader title="Create Event" description="Create a new event for your club." />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need to be assigned to a club before you can create events. Please contact
            an administrator.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  // Check if user is club admin
  if (!clubsLoading && selectedClub && !isAdmin) {
    return (
      <>
        <PageHeader title="Create Event" description="Create a new event for your club." />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Only club administrators can create events. Please contact your club admin.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const clubName = selectedClub ? selectedClub.name : 'your club';

  return (
    <>
      <PageHeader
        title="Create Event"
        description={`Create a new event for ${clubName}.`}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>
                Enter the basic information about your event.
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

          {/* Recurring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Recurring Event
              </CardTitle>
              <CardDescription>
                Create multiple instances of this event on a weekly basis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Make this a recurring event</FormLabel>
                      <FormDescription>
                        Create weekly instances until the end date (max 3 weeks)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchIsRecurring && (
                <>
                  <FormField
                    control={form.control}
                    name="recurrenceEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repeat Until</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => {
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            }}
                            placeholder="Select end date"
                          />
                        </FormControl>
                        <FormDescription>
                          Events will be created weekly until this date.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {recurringCount > 0 && (
                    <Alert>
                      <CalendarPlus className="h-4 w-4" />
                      <AlertDescription>
                        This will create <strong>{recurringCount}</strong> event
                        {recurringCount !== 1 ? 's' : ''} (weekly, including the first event).
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
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
                  Creating...
                </>
              ) : (
                <>
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  {watchIsRecurring && recurringCount > 1
                    ? `Create ${recurringCount} Events`
                    : 'Create Event'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
