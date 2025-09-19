import { notFound } from 'next/navigation';
import { getCircleById } from '@/lib/circles';
import { getPlayersByIds } from '@/lib/data';
import { CircleDetailsClient } from './circle-details-client';
import type { Player } from '@/lib/types';

interface CircleDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function CircleDetailsPage({ params }: CircleDetailsPageProps) {
  try {
    const circle = await getCircleById(params.id);

    if (!circle) {
      notFound();
    }

    // Get the players who are members of this circle
    let members: Player[] = [];
    if (circle.playerIds && circle.playerIds.length > 0) {
      members = await getPlayersByIds(circle.playerIds);
    }

    return <CircleDetailsClient circle={circle} members={members} />;
  } catch (error) {
    console.error('Error loading circle details:', error);
    notFound();
  }
}