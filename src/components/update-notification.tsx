'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpdateNotificationProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  isUpdating?: boolean;
}

export function UpdateNotification({ 
  isVisible, 
  onUpdate, 
  onDismiss, 
  isUpdating = false 
}: UpdateNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
    }
  }, [isVisible]);

  if (!isVisible && !isAnimating) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed top-4 left-4 right-4 z-50 transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}
      onTransitionEnd={() => {
        if (!isVisible) {
          setIsAnimating(false);
        }
      }}
    >
      <Alert className="bg-primary text-primary-foreground border-primary shadow-lg">
        <Download className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex-1 mr-4">
            <strong>Update Available!</strong>
            <br />
            <span className="text-sm opacity-90">
              A new version of the app is ready. Update now for the latest features and fixes.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onUpdate}
              disabled={isUpdating}
              className="bg-background text-foreground hover:bg-background/90"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Now'
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              disabled={isUpdating}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Alternative compact notification for mobile
export function CompactUpdateNotification({ 
  isVisible, 
  onUpdate, 
  onDismiss, 
  isUpdating = false 
}: UpdateNotificationProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:hidden">
      <div className="bg-primary text-primary-foreground rounded-lg p-3 shadow-lg border border-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Download className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium truncate">
              Update available
            </span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onUpdate}
              disabled={isUpdating}
              className="bg-background text-foreground hover:bg-background/90 h-8 px-3 text-xs"
            >
              {isUpdating ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                'Update'
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              disabled={isUpdating}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}