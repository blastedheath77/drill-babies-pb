'use client';

import React from 'react';
import { ErrorBoundary } from './error-boundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  retryText?: string;
}

function AsyncErrorFallback({
  error,
  resetError,
  onRetry,
  retryText = 'Retry',
}: {
  error: Error | null;
  resetError: () => void;
  onRetry?: () => void;
  retryText?: string;
}) {
  const handleRetry = () => {
    resetError();
    onRetry?.();
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Failed</AlertTitle>
          <AlertDescription>
            {error?.message || 'An error occurred while processing your request.'}
          </AlertDescription>
        </Alert>

        <div className="mt-3 flex gap-2">
          <Button onClick={handleRetry} variant="outline" size="sm" className="flex-1">
            <RefreshCw className="h-3 w-3 mr-1" />
            {retryText}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AsyncErrorBoundary({ children, onRetry, retryText }: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <AsyncErrorFallback
          error={error}
          resetError={resetError}
          onRetry={onRetry}
          retryText={retryText}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
