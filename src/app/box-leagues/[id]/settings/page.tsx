import { SettingsClient } from './settings-client';

interface SettingsPageProps {
  params: {
    id: string;
  };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  return <SettingsClient boxLeagueId={params.id} />;
}