import { ErrorBoundary } from '@/components/error-boundary';
import { SettingsClient } from './settings-client';

interface SettingsPageProps {
  params: {
    id: string;
  };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  return (
    <ErrorBoundary>
      <SettingsClient boxLeagueId={params.id} />
    </ErrorBoundary>
  );
}
