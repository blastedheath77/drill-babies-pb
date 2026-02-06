import { EditEventForm } from './edit-event-form';
import { AuthWrapper } from '@/components/auth-wrapper';

interface EditEventPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;

  return (
    <AuthWrapper requireAuth={true}>
      <EditEventForm eventId={id} />
    </AuthWrapper>
  );
}
