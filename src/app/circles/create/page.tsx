import { CreateCircleForm } from './create-circle-form';
import { PageHeader } from '@/components/page-header';

export default function CreateCirclePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Circle"
        description="Create a new circle to organize players and games"
      />
      
      <div className="max-w-2xl">
        <CreateCircleForm />
      </div>
    </div>
  );
}