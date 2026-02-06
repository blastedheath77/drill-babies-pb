import { CreateEventForm } from './create-event-form';
import { AuthWrapper } from '@/components/auth-wrapper';

export default function CreateEventPage() {
  return (
    <AuthWrapper requireAuth={true}>
      <CreateEventForm />
    </AuthWrapper>
  );
}
