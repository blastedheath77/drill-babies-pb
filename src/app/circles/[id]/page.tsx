import { CircleManagementClient } from './circle-management-client';

export default function CircleManagementPage({ params }: { params: { id: string } }) {
  return <CircleManagementClient circleId={params.id} />;
}