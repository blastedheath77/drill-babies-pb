import { getPlayers, getRecentGames } from '@/lib/data';
import { getPartnershipStats } from '@/lib/data';
import { PartnershipsClient } from './partnerships-client';

export default async function PartnershipsPage() {
  const players = await getPlayers();
  const allGames = await getRecentGames(1000); // Get more games for comprehensive analysis

  // Calculate all partnerships
  const allPartnerships = players.map((player) => {
    const partnerships = getPartnershipStats(player.id, allGames);
    return {
      player,
      partnerships,
      totalGames: partnerships.reduce((sum, p) => sum + p.gamesPlayed, 0),
      averageWinRate: partnerships.length > 0 
        ? partnerships.reduce((sum, p) => sum + (p.gamesPlayed > 0 ? p.wins / p.gamesPlayed : 0), 0) / partnerships.length * 100
        : 0
    };
  }).filter(p => p.partnerships.length > 0);

  return <PartnershipsClient allPartnerships={allPartnerships} />;
}