'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';

interface RestrictedPlayerProfileProps {
  playerName?: string;
}

export function RestrictedPlayerProfile({ playerName }: RestrictedPlayerProfileProps) {
  return (
    <>
      <PageHeader
        title="Player Profile Unavailable"
        description="This player's profile is not publicly available"
      >
        <Link href="/players">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Players
          </Button>
        </Link>
      </PageHeader>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center text-center py-12 space-y-4">
          <EyeOff className="h-16 w-16 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Profile Not Available</h3>
            <p className="text-muted-foreground mb-4">
              {playerName ? `${playerName}'s profile` : 'This player profile'} is not publicly available.
            </p>
            <p className="text-sm text-muted-foreground">
              You can still see this player in game results and select them for matches.
            </p>
          </div>
          <Link href="/players">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Players List
            </Button>
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
