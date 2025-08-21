import { CirclesListClient } from './circles-list-client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function CirclesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Circles"
        description="Manage your player circles and invitations"
        action={
          <Link href="/circles/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Circle
            </Button>
          </Link>
        }
      />
      
      <CirclesListClient />
    </div>
  );
}