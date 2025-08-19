import { TournamentsClient } from './tournaments-client';
import { AuthWrapper } from '@/components/auth-wrapper';

export default function TournamentsPage() {
  return (
    <AuthWrapper viewerAllowed={true}>
      <TournamentsClient />
    </AuthWrapper>
  );
}
