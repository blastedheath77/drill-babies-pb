'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Users, Lock, Unlock, Settings, Info } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useCircles } from '@/contexts/circle-context';
import { createCircle } from '@/lib/circles';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const createCircleSchema = z.object({
  name: z.string()
    .min(1, 'Circle name is required')
    .min(3, 'Circle name must be at least 3 characters')
    .max(50, 'Circle name must be less than 50 characters'),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  isPrivate: z.boolean().default(false),
  allowMemberInvites: z.boolean().default(true),
  autoAcceptInvites: z.boolean().default(false),
});

type CreateCircleForm = z.infer<typeof createCircleSchema>;

export function CreateCircleForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshCircles } = useCircles();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateCircleForm>({
    resolver: zodResolver(createCircleSchema),
    defaultValues: {
      name: '',
      description: '',
      isPrivate: false,
      allowMemberInvites: true,
      autoAcceptInvites: false,
    },
  });

  const onSubmit = async (data: CreateCircleForm) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a circle',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      logger.info('Creating circle:', data);

      const result = await createCircle(
        data.name,
        data.description || '',
        user.id,
        data.isPrivate,
        {
          allowMemberInvites: data.allowMemberInvites,
          autoAcceptInvites: data.autoAcceptInvites,
        }
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });

        // Refresh circles context
        await refreshCircles();

        // Navigate to the new circle
        if (result.circleId) {
          router.push(`/circles/${result.circleId}`);
        } else {
          router.push('/circles');
        }
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Failed to create circle:', error);
      toast({
        title: 'Error',
        description: 'Failed to create circle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchIsPrivate = form.watch('isPrivate');
  const watchAutoAcceptInvites = form.watch('autoAcceptInvites');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create New Circle
        </CardTitle>
        <CardDescription>
          Set up a new circle to organize players and manage games together.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Circle Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Downtown Players, Weekend Warriors"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a descriptive name for your circle
                    </FormDescription>
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
                        placeholder="Describe the purpose of this circle..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Help others understand what this circle is about
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Privacy & Access
              </h3>

              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        {watchIsPrivate ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        Private Circle
                      </FormLabel>
                      <FormDescription>
                        {watchIsPrivate 
                          ? 'Only invited members can join this circle'
                          : 'Anyone can request to join this circle'
                        }
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

              <FormField
                control={form.control}
                name="allowMemberInvites"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Member Invitations</FormLabel>
                      <FormDescription>
                        Allow circle members to invite new players
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

              <FormField
                control={form.control}
                name="autoAcceptInvites"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-Accept Invitations</FormLabel>
                      <FormDescription>
                        Automatically accept all invitations without requiring approval
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!watchIsPrivate}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchAutoAcceptInvites && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    With auto-accept enabled, anyone invited to your circle will automatically become a member.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Creating Circle...' : 'Create Circle'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}