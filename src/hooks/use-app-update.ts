'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAppUpdateReturn {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  updateApp: () => void;
  dismissUpdate: () => void;
  checkForUpdate: () => void;
  currentVersion: string | null;
  newVersion: string | null;
}

export function useAppUpdate(): UseAppUpdateReturn {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current app version
  useEffect(() => {
    const version = process.env.NEXT_PUBLIC_APP_VERSION || null;
    setCurrentVersion(version);
  }, []);

  // Service worker update detection
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || window.location.hostname.includes('localhost')) {
      return;
    }

    const handleServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
      if (!registration) return;
      
      serviceWorkerRef.current = registration;

      // Listen for service worker updates
      if (registration.waiting) {
        // SW is waiting to activate
        setIsUpdateAvailable(true);
        setIsDismissed(false);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW is installed and ready
              setIsUpdateAvailable(true);
              setIsDismissed(false);
            }
          });
        }
      });
    };

    // Get existing service worker registration
    navigator.serviceWorker.getRegistration()
      .then((registration) => {
        if (registration) {
          handleServiceWorkerUpdate(registration);
        }
      });

    // Listen for new service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        setNewVersion(event.data.cacheName || 'unknown');
        setIsUpdateAvailable(true);
        setIsDismissed(false);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Listen for service worker controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Reload the page to get the latest content
      if (!isUpdating) {
        window.location.reload();
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isUpdating]);

  // Periodic update checks
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || window.location.hostname.includes('localhost')) {
      return;
    }

    // Check for updates every 5 minutes
    checkIntervalRef.current = setInterval(() => {
      checkForUpdate();
    }, 5 * 60 * 1000);

    // Check for updates when the page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(checkForUpdate, 1000); // Small delay to allow SW to register
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkForUpdate = useCallback(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || window.location.hostname.includes('localhost')) {
      return;
    }

    navigator.serviceWorker.getRegistration()
      .then((registration) => {
        if (registration) {
          // Force check for updates
          try {
            registration.update();
          } catch (updateError) {
            console.warn('Failed to update registration:', updateError);
          }
          
          // Also send message to SW to check for updates
          if (registration.active) {
            try {
              registration.active.postMessage({ type: 'CHECK_UPDATE' });
            } catch (messageError) {
              console.warn('Failed to send message to SW:', messageError);
            }
          }
        }
      })
      .catch((error) => {
        console.warn('Failed to check for service worker updates:', error);
      });
  }, []);

  const updateApp = useCallback(() => {
    if (!serviceWorkerRef.current) {
      // Fallback: hard refresh
      window.location.reload();
      return;
    }

    setIsUpdating(true);

    // Tell the waiting service worker to skip waiting and become active
    if (serviceWorkerRef.current.waiting) {
      serviceWorkerRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // No waiting SW, just reload
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
    setIsUpdateAvailable(false);
  }, []);

  // Don't show update notification if dismissed
  const shouldShowUpdate = isUpdateAvailable && !isDismissed;

  return {
    isUpdateAvailable: shouldShowUpdate,
    isUpdating,
    updateApp,
    dismissUpdate,
    checkForUpdate,
    currentVersion,
    newVersion,
  };
}