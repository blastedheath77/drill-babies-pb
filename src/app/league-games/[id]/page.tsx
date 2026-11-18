'use client';

import { NotFoundMessage } from '@/components/not-found-message';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getLeagueGame } from '../actions';
import { LeagueGameClient } from './league-game-client';
import type { LeagueGame, Player } from '@/lib/types';

interface Props {
  params: { id: string };
}

export default function LeagueGameDetailPage({ params }: Props) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'missing' } | { status: 'ready'; game: LeagueGame; players: Record<string, Player> }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const game = await getLeagueGame(params.id);
      if (!game) {
        if (!cancelled) setState({ status: 'missing' });
        return;
      }
      const entries = await Promise.all(
        game.clubPlayerIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'players', id));
          return snap.exists() ? ([id, { id: snap.id, ...snap.data() } as Player] as const) : null;
        })
      );
      const players = Object.fromEntries(entries.filter((e): e is readonly [string, Player] => e !== null));
      if (!cancelled) setState({ status: 'ready', game, players });
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (state.status === 'missing') return <NotFoundMessage what="Fixture" backHref="/league-games" backLabel="Back to league games" />;
  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-label="Loading" />
      </div>
    );
  }
  return <LeagueGameClient game={state.game} clubPlayers={state.players} />;
}
