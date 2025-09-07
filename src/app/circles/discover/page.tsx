'use client';

import { CircleDiscoveryClient } from './circle-discovery-client';
import { AuthWrapper } from '@/components/auth-wrapper';

export default function CircleDiscoveryPage() {
  return (
    <AuthWrapper>
      <CircleDiscoveryClient />
    </AuthWrapper>
  );
}