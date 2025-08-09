import { getPlayers, getRecentGames } from '@/lib/data';
import { HeadToHeadClient } from './head-to-head-client';

export default async function HeadToHeadPage() {
  const players = await getPlayers();
  const allGames = await getRecentGames(1000); // Get comprehensive game history

  return <HeadToHeadClient players={players} games={allGames} />;
}