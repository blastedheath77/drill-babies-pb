import { Suspense } from 'react';
import { StatisticsClient } from './statistics-client';
import { DataErrorBoundary } from '@/components/data-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

function LoadingSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-80" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="ml-auto flex space-x-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StatisticsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DataErrorBoundary
        fallbackTitle="Statistics Unavailable"
        fallbackDescription="Unable to load player statistics. This may be due to a connection issue."
      >
        <StatisticsClient initialPlayers={[]} />
      </DataErrorBoundary>
    </Suspense>
  );
}
