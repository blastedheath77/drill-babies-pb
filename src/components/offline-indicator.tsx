'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, CloudOff, CheckCircle, AlertCircle } from 'lucide-react';
import { isOnline, onOnlineStatusChange, offlineQueue } from '@/lib/offline-queue';
import { useToast } from '@/hooks/use-toast';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize online status
    setOnline(isOnline());

    // Set up online status listener
    const cleanup = onOnlineStatusChange((newOnlineStatus) => {
      setOnline(newOnlineStatus);
      
      if (newOnlineStatus) {
        // When coming back online, automatically try to sync
        handleSync();
      }
    });

    // Initialize offline queue and check for pending operations
    initializeQueue();

    return cleanup;
  }, []);

  const initializeQueue = async () => {
    try {
      await offlineQueue.init();
      await updateQueuedCount();
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
    }
  };

  const updateQueuedCount = async () => {
    try {
      const operations = await offlineQueue.getQueuedOperations();
      setQueuedCount(operations.length);
    } catch (error) {
      console.error('Failed to get queued operations count:', error);
    }
  };

  const handleSync = async () => {
    if (!online || syncing) return;

    setSyncing(true);
    try {
      const result = await offlineQueue.syncOperations();
      
      if (result.success > 0) {
        toast({
          title: 'Sync Complete',
          description: `Successfully synced ${result.success} operations.`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          variant: 'destructive',
          title: 'Sync Issues',
          description: `${result.failed} operations failed to sync and will be retried later.`,
        });
      }
      
      await updateQueuedCount();
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: 'Failed to sync offline operations. Will retry automatically.',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (online && queuedCount === 0) {
    return null; // Don't show indicator when online and no pending operations
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col gap-2 items-end">
        {/* Online/Offline Status */}
        <Badge 
          variant={online ? "default" : "destructive"}
          className="flex items-center gap-2 px-3 py-2 shadow-lg"
        >
          {online ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Offline</span>
            </>
          )}
        </Badge>

        {/* Queued Operations */}
        {queuedCount > 0 && (
          <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg">
            <CloudOff className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {queuedCount} queued
            </span>
            {online && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                className="h-6 px-2 text-xs"
              >
                {syncing ? (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Sync
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}