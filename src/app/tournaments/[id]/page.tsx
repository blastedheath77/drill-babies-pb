'use client';

import { NotFoundMessage } from '@/components/not-found-message';
import { PageHeader } from '@/components/page-header';
import { TournamentClient } from './tournament-client';
import { QuickPlaySession } from './quick-play-session';
import { useTournamentDetail } from '@/hooks/use-tournament-detail';

export default function TournamentDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useTournamentDetail(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-label="Loading" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-destructive py-8 text-center">
        Couldn&apos;t load this session. {String((error as Error).message ?? '')}
      </p>
    );
  }
  if (!data) return <NotFoundMessage what="Session" backHref="/tournaments" backLabel="Back to sessions" />;

  if (data.tournament.isQuickPlay) return <QuickPlaySession detail={data} />;

  return (
    <>
      <PageHeader title={data.tournament.name} description={data.tournament.description} />
      <TournamentClient
        tournament={data.tournament}
        matches={data.matches}
        standings={data.standings}
        playerMap={data.playerMap}
      />
    </>
  );
}
