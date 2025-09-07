'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useCircles } from '@/contexts/circle-context';

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
import { addPlayer } from './actions';
import { AuthWrapper } from '@/components/auth-wrapper';

const addPlayerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

function AddPlayerContent() {
  const { toast } = useToast();
  const router = useRouter();
  const { invalidateAll, refetchAll } = useInvalidatePlayers();
  const { selectedCircleId } = useCircles();

  const form = useForm<z.infer<typeof addPlayerSchema>>({
    resolver: zodResolver(addPlayerSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof addPlayerSchema>) {
    try {
      // Pass circle context to associate phantom player with current circle
      const circleId = selectedCircleId === 'all' ? undefined : selectedCircleId;
      await addPlayer({ ...values, circleId });
      
      // Force fresh data fetch before navigation
      await refetchAll();
      
      toast({
        title: 'Player Added!',
        description: `${values.name} has been added to the ${circleId ? 'current circle' : 'club'}.`,
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

  return (
    <>
      <PageHeader title="Add New Player" description="Add a new member to the pickleball club." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Player Details</CardTitle>
              <CardDescription>Add a new phantom player to track their games and stats.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="jane.doe@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      If provided, the player can claim this profile when they register.
                    </p>
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
