'use client';

import { NotFoundMessage } from '@/components/not-found-message';
import { useQuery } from '@tanstack/react-query';
import { getCircleById } from '@/lib/circles';
import { getPlayersByIds } from '@/lib/data';
import { CircleDetailsClient } from './circle-details-client';

export default function CircleDetailsPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['circle-detail', params.id],
    queryFn: async () => {
      const circle = await getCircleById(params.id);
      if (!circle) return null;
      const members = circle.playerIds?.length ? await getPlayersByIds(circle.playerIds) : [];
      return { circle, members };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-label="Loading" />
      </div>
    );
  }
  if (!data) return <NotFoundMessage what="Group" backHref="/circles" backLabel="Back to groups" />;
  return <CircleDetailsClient circle={data.circle} members={data.members} />;
}
