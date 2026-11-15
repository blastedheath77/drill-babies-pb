'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { FriendlyForm } from '@/components/friendlies/friendly-form';
import { NotFoundMessage } from '@/components/not-found-message';
import { useFriendly } from '@/hooks/use-friendlies';

export default function EditFriendlyPage({ params }: { params: { id: string } }) {
  const { data: friendly, isLoading } = useFriendly(params.id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!friendly) return <NotFoundMessage what="Friendly" backHref="/friendlies" backLabel="Back to friendlies" />;

  const locked = friendly.status !== 'draft' || friendly.matches.some((m) => m.status === 'completed');
  if (locked) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <h1 className="text-xl font-semibold">This friendly can&apos;t be edited</h1>
        <p className="text-muted-foreground">
          Squads and settings can only change while it&apos;s being planned and before any scores are entered.
        </p>
        <Link href={`/friendlies/${friendly.id}`} className="text-primary font-medium">
          Back to the friendly
        </Link>
      </div>
    );
  }
  return <FriendlyForm initial={friendly} />;
}
