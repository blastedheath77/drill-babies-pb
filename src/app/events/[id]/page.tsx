import { EventDetailClient } from './event-detail-client';
import { AuthWrapper } from '@/components/auth-wrapper';

interface EventDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;

  return (
    <AuthWrapper viewerAllowed={true}>
      <EventDetailClient eventId={id} />
    </AuthWrapper>
  );
}
