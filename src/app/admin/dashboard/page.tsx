'use client';

import { AdminDashboard } from './admin-dashboard';
import { AuthWrapper } from '@/components/auth-wrapper';

export default function AdminDashboardPage() {
  return (
    <AuthWrapper adminOnly={true}>
      <AdminDashboard />
    </AuthWrapper>
  );
}