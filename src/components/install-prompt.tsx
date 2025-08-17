'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check if running in native app webview (iOS)
      const isWebview = (window.navigator as any).standalone === true;
      
      setIsInstalled(isStandalone || isWebview);
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Don't show prompt if already installed
      if (!isInstalled) {
        // Show prompt after a delay to avoid being too aggressive
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if:
  // - Already installed
  // - No deferred prompt available
  // - User dismissed in this session
  // - Mobile device detection shows it's not a supported mobile browser
  if (
    isInstalled || 
    !deferredPrompt || 
    !showPrompt ||
    sessionStorage.getItem('pwa-install-dismissed')
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:w-80">
      <Card className="shadow-lg border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-medium">Install PB Stats</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-destructive/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground mb-3">
            Install our app for a better experience with offline support and quick access.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="flex-1 h-8 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="h-8 text-xs"
            >
              Not now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}