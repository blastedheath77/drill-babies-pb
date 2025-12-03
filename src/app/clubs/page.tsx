import { Metadata } from 'next';
import { ClubsClient } from './clubs-client';

export const metadata: Metadata = {
  title: 'Clubs | PBStats',
  description: 'Manage clubs',
};

export default function ClubsPage() {
  return <ClubsClient />;
}
