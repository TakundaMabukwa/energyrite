'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const viaMedia = window.matchMedia('(display-mode: standalone)').matches;
  const viaNavigator = Boolean((window.navigator as any).standalone);
  return viaMedia || viaNavigator;
}

function isIOSDevice() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const ios = useMemo(() => (typeof window !== 'undefined' ? isIOSDevice() : false), []);
  
  const hidePrompt = () => {
    setVisible(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const installed = isStandaloneMode();

    if (installed) {
      return;
    }

    if (isIOSDevice()) {
      setVisible(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onAppInstalled = () => {
      hidePrompt();
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const onInstallClick = async () => {
    if (ios) {
      setShowIOSInstructions(true);
      hidePrompt();
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch (error) {
        console.warn('Install prompt failed:', error);
      }
    }

    hidePrompt();
  };

  if (!visible || isStandaloneMode()) return null;

  return (
    <>
      <div className="right-3 bottom-3 left-3 z-[60] fixed bg-white shadow-lg px-3 py-3 border border-gray-200 rounded-xl">
        <div className="flex sm:flex-row flex-col sm:items-center gap-2 sm:gap-3">
          <div className="text-sm">
            <div className="font-semibold text-gray-900">Install Energy Rite</div>
            <div className="text-gray-600">Get an app-like full-screen experience.</div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={hidePrompt}>
              Not now
            </Button>
            <Button size="sm" onClick={onInstallClick}>
              Install
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install on iPhone</DialogTitle>
            <DialogDescription>
              In Safari, tap Share, then select Add to Home Screen, then tap Add.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowIOSInstructions(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
