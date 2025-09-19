import { PageHeader } from '@/components/page-header';
import { getCircles } from '@/lib/circles';
import { CirclesClient } from './circles-client';
import { ClientOnly } from '@/components/client-only';
import { DataErrorBoundary } from '@/components/data-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function CirclesPage() {
  let initialCircles: any[] = [];

  try {
    // Get initial data on server for SEO and faster first load
    initialCircles = await getCircles();
  } catch (error) {
    console.error('Failed to load initial circles:', error);
    // Continue with empty array, client will handle loading
  }

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Player Circles"
        description="Manage player groups for filtering statistics and organizing your club."
      />
      <ClientOnly fallback={<LoadingSkeleton />}>
        <DataErrorBoundary
          fallbackTitle="Circles Unavailable"
          fallbackDescription="Unable to load player circles. This may be due to a connection issue."
        >
          <CirclesClient initialCircles={initialCircles} />
        </DataErrorBoundary>
      </ClientOnly>
    </>
  );
}