import { CycleCompletionClient } from './cycle-completion-client';

export default function CycleCompletionPage({ params }: { params: { id: string } }) {
  return <CycleCompletionClient boxLeagueId={params.id} />;
}
