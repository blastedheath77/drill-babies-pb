import { Metadata } from 'next';
import { SettingsClient } from './settings-client';

export const metadata: Metadata = {
  title: 'Settings | Pickleball Stats Tracker',
  description: 'Manage your account and preferences',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
