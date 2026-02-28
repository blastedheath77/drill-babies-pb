'use client';

import { AuthWrapper } from '@/components/auth-wrapper';
import { CreateLeagueGameForm } from './create-league-game-form';
import { PageHeader } from '@/components/page-header';

export default function CreateLeagueGamePage() {
  return (
    <AuthWrapper playerOnly={true}>
      <PageHeader
        title="New League Fixture"
        description="Create a PBS league fixture and record the 9-game team result."
      />
      <CreateLeagueGameForm />
    </AuthWrapper>
  );
}
