'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { Loader2, AlertCircle } from 'lucide-react';

export function PartnershipsSimple() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Partnership Analysis"
        description="Comprehensive analysis of doubles partnerships across all players."
      />
      <Card>
        <CardHeader>
          <CardTitle>Partnerships</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Partnership analysis will be available once the hooks issue is resolved.</p>
        </CardContent>
      </Card>
    </div>
  );
}