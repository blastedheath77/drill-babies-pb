'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminDashboard } from './admin-dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && !isAdmin()) {
      router.push('/');
    }
  }, [user, isLoading, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin()) {
    return (
      <Card className="max-w-md mx-auto mt-16">
        <CardContent className="text-center py-8">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You need admin privileges to access this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <AdminDashboard />;
}