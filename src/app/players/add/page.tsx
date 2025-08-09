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
import { addPlayer } from './actions';

const addPlayerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
});

export default function AddPlayerPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { invalidateAll } = useInvalidatePlayers();

  const form = useForm<z.infer<typeof addPlayerSchema>>({
    resolver: zodResolver(addPlayerSchema),
    defaultValues: {
      name: '',
    },
  });

  async function onSubmit(values: z.infer<typeof addPlayerSchema>) {
    try {
      await addPlayer(values);
      
      // Invalidate React Query cache to refresh player lists immediately
      invalidateAll();
      
      toast({
        title: 'Player Added!',
        description: `${values.name} has been added to the club.`,
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
              <CardDescription>Enter the new player's name below.</CardDescription>
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
