import { getPlayers } from '@/lib/data';
import { CreateTournamentForm } from './create-tournament-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function CreateTournamentPage() {
  const players = await getPlayers();

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/tournaments">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Tournament</h1>
          <p className="text-muted-foreground">Set up a new tournament for your club.</p>
        </div>
      </div>

      <CreateTournamentForm players={players} />
    </>
  );
}
