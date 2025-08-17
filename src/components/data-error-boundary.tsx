'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { ErrorBoundary } from './error-boundary';

interface DataErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onRetry?: () => void;
  showConnectionStatus?: boolean;
}

function DataErrorFallback({
  error,
  resetError,
  onRetry,
  fallbackTitle = 'Data Loading Failed',
  fallbackDescription,
  showConnectionStatus = true,
}: {
  error: Error | null;
  resetError: () => void;
  onRetry?: () => void;
  fallbackTitle?: string;
  fallbackDescription?: string;
  showConnectionStatus?: boolean;
}) {
  const [isOnline, setIsOnline] = React.useState(navigator?.onLine ?? true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    resetError();
    onRetry?.();
  };

  const isConnectionError = error?.message?.includes('timeout') || 
                           error?.message?.includes('UNAVAILABLE') || 
                           error?.message?.includes('network') ||
                           !isOnline;

  const getErrorMessage = () => {
    if (fallbackDescription) return fallbackDescription;
    
    if (isConnectionError) {
      return isOnline 
        ? 'Unable to connect to the database. Please check your internet connection and try again.'
        : 'You appear to be offline. Please check your internet connection.';
    }
    
    return error?.message || 'An unexpected error occurred while loading data.';
  };

  return (
    <div className="flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{fallbackTitle}</AlertTitle>
          <AlertDescription className="mt-2">
            {getErrorMessage()}
          </AlertDescription>
        </Alert>

        {showConnectionStatus && (
          <div className={`mt-3 flex items-center gap-2 text-sm ${
            isOnline ? 'text-green-600' : 'text-red-600'
          }`}>
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span>{isOnline ? 'Connected' : 'Offline'}</span>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button onClick={handleRetry} variant="outline" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          {isConnectionError && (
            <Button 
              onClick={() => window.location.reload()} 
              variant="default" 
              className="flex-1"
            >
              Refresh Page
            </Button>
          )}
        </div>

        {process.env.NODE_ENV === 'development' && error?.stack && (
          <details className="mt-4 p-3 bg-gray-100 rounded-md text-xs">
            <summary className="cursor-pointer font-medium">Error Details (Dev)</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

export function DataErrorBoundary({ 
  children, 
  fallbackTitle,
  fallbackDescription,
  onRetry,
  showConnectionStatus = true 
}: DataErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <DataErrorFallback
          error={error}
          resetError={resetError}
          onRetry={onRetry}
          fallbackTitle={fallbackTitle}
          fallbackDescription={fallbackDescription}
          showConnectionStatus={showConnectionStatus}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}