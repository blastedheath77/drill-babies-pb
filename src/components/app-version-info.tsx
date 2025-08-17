'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Smartphone, Monitor } from 'lucide-react';
import { useAppUpdate } from '@/hooks/use-app-update';

export function AppVersionInfo() {
  const { 
    isUpdateAvailable, 
    isUpdating, 
    updateApp, 
    checkForUpdate, 
    currentVersion 
  } = useAppUpdate();

  const handleCheckUpdate = () => {
    checkForUpdate();
  };

  const handleUpdate = () => {
    updateApp();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          App Version & Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Current Version</p>
            <p className="text-xs text-muted-foreground font-mono">
              {currentVersion || 'Unknown'}
            </p>
          </div>
          <Badge variant={isUpdateAvailable ? 'destructive' : 'secondary'}>
            {isUpdateAvailable ? 'Update Available' : 'Up to Date'}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Installation Type</p>
            <p className="text-xs text-muted-foreground">
              {typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
                ? 'PWA (Home Screen)'
                : 'Browser'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches ? (
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Monitor className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="pt-2 border-t space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckUpdate}
            disabled={isUpdating}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
            Check for Updates
          </Button>

          {isUpdateAvailable && (
            <Button
              variant="default"
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isUpdating ? 'Updating...' : 'Update Now'}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Updates are checked automatically every minute</p>
          <p>• PWA installations may require manual refresh</p>
          <p>• Clear browser cache if updates don't appear</p>
        </div>
      </CardContent>
    </Card>
  );
}