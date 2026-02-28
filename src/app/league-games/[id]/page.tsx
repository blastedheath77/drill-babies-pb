import { notFound } from 'next/navigation';
import { AuthWrapper } from '@/components/auth-wrapper';
import { getLeagueGame } from '../actions';
import { LeagueGameClient } from './league-game-client';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Player } from '@/lib/types';

interface Props {
  params: { id: string };
}

async function getClubPlayers(playerIds: string[]): Promise<Map<string, Player>> {
  const map = new Map<string, Player>();
  await Promise.all(
    playerIds.map(async (id) => {
      const snap = await getDoc(doc(db, 'players', id));
      if (snap.exists()) {
        map.set(id, { id: snap.id, ...snap.data() } as Player);
      }
    })
  );
  return map;
}

export default async function LeagueGameDetailPage({ params }: Props) {
  const game = await getLeagueGame(params.id);

  if (!game) {
    notFound();
  }

  const clubPlayersMap = await getClubPlayers(game.clubPlayerIds);
  const clubPlayers = Object.fromEntries(clubPlayersMap.entries());

  return (
    <AuthWrapper viewerAllowed={true}>
      <LeagueGameClient game={game} clubPlayers={clubPlayers} />
    </AuthWrapper>
  );
}
