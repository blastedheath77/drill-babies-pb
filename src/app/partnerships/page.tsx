'use client';

import { PartnershipsClientV2 } from './partnerships-client-v2';
import { DataErrorBoundary } from '@/components/data-error-boundary';

export default function PartnershipsPage() {
  return (
    <DataErrorBoundary
      fallbackTitle="Partnership Data Unavailable"
      fallbackDescription="Unable to load partnership analysis data. This may be due to a connection issue or if no games have been recorded yet."
    >
      <PartnershipsClientV2 />
    </DataErrorBoundary>
  );
}