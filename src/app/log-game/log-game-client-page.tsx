'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import React from 'react';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Player } from '@/lib/types';
import { logGame } from '@/app/log-game/actions';
import { PageHeader } from '@/components/page-header';

interface LogGameClientPageProps {
  players: Player[];
}

const logGameSchema = z.object({
  gameType: z.enum(['singles', 'doubles']),
  team1Player1: z.string().min(1, 'Player is required'),
  team1Player2: z.string().optional(),
  team1Score: z.coerce.number().min(0),
  team2Player1: z.string().min(1, 'Player is required'),
  team2Player2: z.string().optional(),
  team2Score: z.coerce.number().min(0),
});

export function LogGameClientPage({ players }: LogGameClientPageProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof logGameSchema>>({
    resolver: zodResolver(logGameSchema),
    defaultValues: {
      gameType: 'doubles',
      team1Player1: '',
      team1Player2: '',
      team1Score: 0,
      team2Player1: '',
      team2Player2: '',
      team2Score: 0,
    },
  });

  const gameType = form.watch('gameType');

  async function onSubmit(values: z.infer<typeof logGameSchema>) {
    try {
      await logGame(values);
      toast({
        title: 'Game logged!',
        description: 'The game has been successfully added to the records.',
      });
      form.reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error logging game',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Log New Game"
        description="Record the details of a recently played match."
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Match Details</CardTitle>
              <CardDescription>
                Fill out the form below to add a game to the records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FormField
                control={form.control}
                name="gameType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Game Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === 'singles') {
                            form.setValue('team1Player2', '');
                            form.setValue('team2Player2', '');
                          }
                        }}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="singles" />
                          </FormControl>
                          <FormLabel className="font-normal">Singles</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="doubles" />
                          </FormControl>
                          <FormLabel className="font-normal">Doubles</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Team 1</h3>
                  <FormField
                    control={form.control}
                    name="team1Player1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Player 1</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a player" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {players.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {gameType === 'doubles' && (
                    <FormField
                      control={form.control}
                      name="team1Player2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Player 2</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a player" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {players.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="team1Score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Score</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Team 2</h3>
                  <FormField
                    control={form.control}
                    name="team2Player1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Player 1</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a player" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {players.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {gameType === 'doubles' && (
                    <FormField
                      control={form.control}
                      name="team2Player2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Player 2</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a player" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {players.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="team2Score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Score</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onFocus={(e) => e.target.select()} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit">Submit Game</Button>
          </div>
        </form>
      </Form>
    </>
  );
}
