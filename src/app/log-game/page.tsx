import { getPlayers } from '@/lib/data';
import { LogGameClientPage } from './log-game-client-page';

export default async function LogGamePage() {
  const players = await getPlayers();

  return <LogGameClientPage players={players} />;
}
