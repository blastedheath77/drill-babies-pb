'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlayers } from '@/hooks/use-players';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function PlayersPage() {
  const { data: players, isLoading, error, isError } = usePlayers();

  if (isError) {
    return (
      <>
        <PageHeader
          title="Club Players"
          description="Browse the list of all active players in the club."
        >
          <Link href="/players/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          </Link>
        </PageHeader>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load players. {error?.message || 'Please try refreshing the page.'}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  if (isLoading || !players) {
    return (
      <>
        <PageHeader
          title="Club Players"
          description="Browse the list of all active players in the club."
        >
          <Link href="/players/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          </Link>
        </PageHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Skeleton className="h-24 w-24 rounded-full mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Club Players"
        description={`Browse the list of all ${players.length} active players in the club.`}
      >
        <Link href="/players/add">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Player
          </Button>
        </Link>
      </PageHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {players.map((player) => (
          <Link href={`/players/${player.id}`} key={player.id}>
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4 border-4 border-background ring-2 ring-primary">
                  <AvatarImage src={player.avatar} alt={player.name} data-ai-hint="player avatar" />
                  <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{player.name}</h3>
                <p className="text-muted-foreground">Rating: {player.rating.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {player.wins}W / {player.losses}L
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
