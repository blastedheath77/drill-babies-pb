'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, HelpCircle, X, User } from 'lucide-react';
import type { EventRsvp, RsvpResponse } from '@/lib/types';

interface RsvpListProps {
  rsvps: EventRsvp[];
  userNames?: Map<string, string>;
  className?: string;
}

interface RsvpGroup {
  response: RsvpResponse;
  label: string;
  icon: React.ReactNode;
  color: string;
  rsvps: EventRsvp[];
}

export function RsvpList({ rsvps, userNames, className }: RsvpListProps) {
  const groups: RsvpGroup[] = [
    {
      response: 'yes',
      label: 'Going',
      icon: <Check className="h-4 w-4" />,
      color: 'text-green-600',
      rsvps: rsvps.filter((r) => r.response === 'yes'),
    },
    {
      response: 'maybe',
      label: 'Maybe',
      icon: <HelpCircle className="h-4 w-4" />,
      color: 'text-yellow-600',
      rsvps: rsvps.filter((r) => r.response === 'maybe'),
    },
    {
      response: 'no',
      label: 'Not Going',
      icon: <X className="h-4 w-4" />,
      color: 'text-red-600',
      rsvps: rsvps.filter((r) => r.response === 'no'),
    },
  ];

  if (rsvps.length === 0) {
    return (
      <div className={cn('text-center text-muted-foreground py-4', className)}>
        No responses yet
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {groups.map((group) => (
        <div key={group.response}>
          <div className={cn('flex items-center gap-2 mb-2', group.color)}>
            {group.icon}
            <span className="font-medium">{group.label}</span>
            <Badge variant="secondary" className="ml-auto">
              {group.rsvps.length}
            </Badge>
          </div>

          {group.rsvps.length > 0 ? (
            <div className="space-y-2">
              {group.rsvps.map((rsvp) => {
                const userName = userNames?.get(rsvp.userId) || 'Unknown User';
                const initials = userName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={rsvp.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {initials || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{userName}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pl-6">No one yet</p>
          )}
        </div>
      ))}
    </div>
  );
}

interface RsvpSummaryProps {
  counts: {
    yes: number;
    maybe: number;
    no: number;
  };
  className?: string;
}

export function RsvpSummary({ counts, className }: RsvpSummaryProps) {
  const total = counts.yes + counts.maybe + counts.no;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-1 text-green-600">
        <Check className="h-4 w-4" />
        <span className="text-sm font-medium">{counts.yes}</span>
      </div>
      <div className="flex items-center gap-1 text-yellow-600">
        <HelpCircle className="h-4 w-4" />
        <span className="text-sm font-medium">{counts.maybe}</span>
      </div>
      <div className="flex items-center gap-1 text-red-600">
        <X className="h-4 w-4" />
        <span className="text-sm font-medium">{counts.no}</span>
      </div>
      {total > 0 && (
        <span className="text-sm text-muted-foreground ml-1">({total} total)</span>
      )}
    </div>
  );
}
