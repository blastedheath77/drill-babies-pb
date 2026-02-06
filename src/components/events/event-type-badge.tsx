'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EventType } from '@/lib/types';

interface EventTypeBadgeProps {
  type: EventType;
  customType?: string;
  className?: string;
}

const typeConfig: Record<EventType, { label: string; className: string }> = {
  training: {
    label: 'Training',
    className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
  },
  league_match: {
    label: 'League Match',
    className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100',
  },
  friendly: {
    label: 'Friendly',
    className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  },
  other: {
    label: 'Other',
    className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100',
  },
};

export function EventTypeBadge({ type, customType, className }: EventTypeBadgeProps) {
  const config = typeConfig[type];
  const label = type === 'other' && customType ? customType : config.label;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {label}
    </Badge>
  );
}
