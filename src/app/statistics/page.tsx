import { PageHeader } from '@/components/page-header';
import { getPlayers } from '@/lib/data';
import { StatisticsClient } from './statistics-client';

export default async function StatisticsPage() {
  // Get initial data on server for SEO and faster first load
  const initialPlayers = await getPlayers();

  return (
    <>
      <PageHeader
        title="Club Statistics"
        description="View player leaderboards and overall club stats. Click column headers to sort."
      />
      <StatisticsClient initialPlayers={initialPlayers} />
    </>
  );
}
