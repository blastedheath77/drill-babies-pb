'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import React from 'react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useInvalidatePlayers } from '@/hooks/use-players';
import { useClub } from '@/contexts/club-context';
import { addPlayer } from './actions';
import { AuthWrapper } from '@/components/auth-wrapper';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const addPlayerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
});

function AddPlayerContent() {
  const { toast } = useToast();
  const router = useRouter();
  const { invalidateAll, refetchAll } = useInvalidatePlayers();
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();

  const form = useForm<z.infer<typeof addPlayerSchema>>({
    resolver: zodResolver(addPlayerSchema),
    defaultValues: {
      name: '',
    },
  });

  async function onSubmit(values: z.infer<typeof addPlayerSchema>) {
    if (!selectedClub?.id) {
      toast({
        variant: 'destructive',
        title: 'No Club Selected',
        description: 'Please select a club before adding a player.',
      });
      return;
    }

    try {
      await addPlayer({ ...values, clubId: selectedClub.id });

      // Force fresh data fetch before navigation
      await refetchAll();

      toast({
        title: 'Player Added!',
        description: `${values.name} has been added to ${selectedClub.name}.`,
      });

      router.push('/players');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error adding player',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    }
  }

  // Show message if user has no clubs
  if (!clubsLoading && !hasAnyClubs) {
    return (
      <>
        <PageHeader title="Add New Player" description="Add a new member to the pickleball club." />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need to be assigned to a club before you can add players. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const clubName = selectedClub ? selectedClub.name : 'your club';

  return (
    <>
      <PageHeader
        title="Add New Player"
        description={`Add a new member to ${clubName}.`}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Player Details</CardTitle>
              <CardDescription>
                Enter the new player's name below. They will be added to {clubName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit">Add Player</Button>
          </div>
        </form>
      </Form>
    </>
  );
}

export default function AddPlayerPage() {
  return (
    <AuthWrapper playerOnly={true}>
      <AddPlayerContent />
    </AuthWrapper>
  );
}
