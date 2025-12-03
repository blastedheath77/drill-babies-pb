import { Metadata } from 'next';
import { ClubSettingsClient } from './settings-client';

export const metadata: Metadata = {
  title: 'Club Settings | PBStats',
  description: 'Manage club settings',
};

export default function ClubSettingsPage({ params }: { params: { id: string } }) {
  return <ClubSettingsClient clubId={params.id} />;
}
