import { EventsClient } from './events-client';
import { AuthWrapper } from '@/components/auth-wrapper';

export default function EventsPage() {
  return (
    <AuthWrapper viewerAllowed={true}>
      <EventsClient />
    </AuthWrapper>
  );
}
