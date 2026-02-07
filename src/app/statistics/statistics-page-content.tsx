'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RankingsClient } from './rankings-client';
import { PartnershipsClientV2 } from './partnerships-client';
import { HeadToHeadClient } from './head-to-head-client';
import { DataErrorBoundary } from '@/components/data-error-boundary';

export function StatisticsPageContent() {
  return (
    <Tabs defaultValue="rankings">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="rankings">Rankings</TabsTrigger>
        <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
        <TabsTrigger value="head-to-head">Head-to-Head</TabsTrigger>
      </TabsList>

      <TabsContent value="rankings" className="mt-6">
        <DataErrorBoundary
          fallbackTitle="Rankings Unavailable"
          fallbackDescription="Unable to load player rankings. This may be due to a connection issue."
        >
          <RankingsClient initialPlayers={[]} />
        </DataErrorBoundary>
      </TabsContent>

      <TabsContent value="partnerships" className="mt-6">
        <DataErrorBoundary
          fallbackTitle="Partnership Data Unavailable"
          fallbackDescription="Unable to load partnership analysis data. This may be due to a connection issue or if no games have been recorded yet."
        >
          <PartnershipsClientV2 />
        </DataErrorBoundary>
      </TabsContent>

      <TabsContent value="head-to-head" className="mt-6">
        <DataErrorBoundary
          fallbackTitle="Head-to-Head Data Unavailable"
          fallbackDescription="Unable to load head-to-head comparison data. This may be due to a connection issue."
        >
          <HeadToHeadClient />
        </DataErrorBoundary>
      </TabsContent>
    </Tabs>
  );
}
