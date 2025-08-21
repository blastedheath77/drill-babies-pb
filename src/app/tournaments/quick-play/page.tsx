import { AuthWrapper } from '@/components/auth-wrapper';
import { QuickPlayForm } from './quick-play-form';

export default function QuickPlayPage() {
  return (
    <AuthWrapper viewerAllowed={true}>
      <QuickPlayForm />
    </AuthWrapper>
  );
}