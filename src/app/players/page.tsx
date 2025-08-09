import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlayers } from '@/lib/data';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default async function PlayersPage() {
  const players = await getPlayers();

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
