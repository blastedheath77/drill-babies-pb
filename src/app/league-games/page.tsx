import { LeagueGamesClient } from './league-games-client';
import { AuthWrapper } from '@/components/auth-wrapper';

export default function LeagueGamesPage() {
  return (
    <AuthWrapper viewerAllowed={true}>
      <LeagueGamesClient />
    </AuthWrapper>
  );
}
