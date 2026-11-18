'use client';

import Link from 'next/link';
import { Handshake, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/contexts/auth-context';
import { useFriendlies } from '@/hooks/use-friendlies';
import { tallyFriendly } from '@/lib/friendlies';

const STATUS_LABEL = { draft: 'Planning', live: 'Live', finished: 'Finished' } as const;

export default function FriendliesPage() {
  const { canCreateTournaments } = useAuth();
  const { data: friendlies = [], isLoading, error } = useFriendlies();

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Friendlies"
        description="Matchups against other teams. Visitors are just names, and results don't change club ratings."
      />

      {canCreateTournaments() && (
        <Link href="/friendlies/new" className="block mb-4">
          <Button className="w-full h-12 text-base">
            <Plus className="h-5 w-5 mr-1" /> New friendly
          </Button>
        </Link>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && <p className="text-destructive">Couldn&apos;t load friendlies: {(error as Error).message}</p>}

      {!isLoading && friendlies.length === 0 && (
        <div className="rounded-xl border p-8 text-center text-muted-foreground">
          <Handshake className="h-10 w-10 mx-auto mb-3" />
          No friendlies yet. Build your first matchup: pick your squad, paste the visitors&apos; names, and get a fair
          schedule.
        </div>
      )}

      <div className="space-y-2">
        {friendlies.map((f) => {
          const t = tallyFriendly(f);
          return (
            <Link key={f.id} href={`/friendlies/${f.id}`} className="block rounded-xl border p-3 hover:bg-accent/50">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate">vs {f.opponentName}</span>
                <Badge variant={f.status === 'live' ? 'default' : 'secondary'}>{STATUS_LABEL[f.status]}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                <span>{new Date(f.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span>
                  {f.homePlayerIds.length} v {f.guests.length}
                </span>
                {t.played > 0 && (
                  <span className="text-foreground font-medium">
                    {t.homeMatches}–{t.awayMatches} in matches
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
