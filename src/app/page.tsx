'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClub } from '@/contexts/club-context';
import { Users, BarChart, CalendarDays, Trophy, PlusSquare } from 'lucide-react';
import { PaddleIcon } from '@/components/icons/paddle-icon';
import Link from 'next/link';

const navButtons: { title: string; href: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { title: 'Players', href: '/players', icon: Users, description: 'Browse & manage players' },
  { title: 'Games', href: '/games', icon: PaddleIcon, description: 'View game history' },
  { title: 'Stats', href: '/statistics', icon: BarChart, description: 'Rankings & analytics' },
  { title: 'Events', href: '/events', icon: CalendarDays, description: 'Upcoming events' },
  { title: 'Sessions', href: '/tournaments', icon: Trophy, description: 'Tournaments & sessions' },
  { title: 'Log Game', href: '/log-game', icon: PlusSquare, description: 'Record a new game' },
];

export default function Home() {
  const { selectedClub, hasAnyClubs, isLoading: clubsLoading } = useClub();

  if (!clubsLoading && !hasAnyClubs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Users className="h-6 w-6" />
              No Club Access
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You are not assigned to any clubs yet. Please contact an administrator to get access to a club.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {selectedClub && (
        <h1 className="text-2xl font-bold mb-8">{selectedClub.name}</h1>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg">
        {navButtons.map(({ title, href, icon: Icon, description }) => (
          <Link key={href} href={href} className="block">
            <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border bg-card hover:bg-accent transition-colors cursor-pointer text-center h-full aspect-square">
              <Icon className="h-8 w-8 text-primary" />
              <span className="font-semibold text-sm">{title}</span>
              <span className="text-xs text-muted-foreground leading-tight">{description}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
