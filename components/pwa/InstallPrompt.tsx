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

function isAndroidDevice() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /android/.test(ua);
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isSecureContextState, setIsSecureContextState] = useState(true);
  const [hasSWController, setHasSWController] = useState(false);
  const [isLikelyInAppBrowser, setIsLikelyInAppBrowser] = useState(false);

  const ios = useMemo(() => (typeof window !== 'undefined' ? isIOSDevice() : false), []);
  const android = useMemo(() => (typeof window !== 'undefined' ? isAndroidDevice() : false), []);
  
  const hidePrompt = () => {
    setVisible(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsSecureContextState(window.isSecureContext);
    setHasSWController(Boolean(navigator.serviceWorker?.controller));
    const ua = navigator.userAgent.toLowerCase();
    const inApp = ua.includes(' wv') || ua.includes('fbav') || ua.includes('instagram') || ua.includes('line/');
    setIsLikelyInAppBrowser(inApp);

    const installed = isStandaloneMode();

    if (installed) {
      return;
    }

    if (isIOSDevice()) {
      setVisible(true);
      return;
    }

    // Always show install banner on Android/desktop web when not installed.
    // If native install prompt is available we'll use it, otherwise show manual steps.
    setVisible(true);

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
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setShowAndroidInstructions(false);
      } catch (error) {
        console.warn('Install prompt failed:', error);
      }
    } else {
      setShowAndroidInstructions(true);
      return;
    }

    hidePrompt();
  };

  if (!visible || isStandaloneMode()) return null;

  const installCtaLabel = ios
    ? 'Install'
    : deferredPrompt
      ? 'Install'
      : android
        ? 'Add to Home Screen'
        : 'Install';

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
              {installCtaLabel}
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

      <Dialog open={showAndroidInstructions} onOpenChange={setShowAndroidInstructions}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install on Android</DialogTitle>
            <DialogDescription>
              Tap the browser menu (three dots), then choose Add to Home screen. If available, Install app is the full PWA option.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-xs text-gray-600">
            {!isSecureContextState && <p>Blocked: insecure context. Open over HTTPS.</p>}
            {isLikelyInAppBrowser && <p>Blocked: in-app browser detected. Open this link in Chrome app.</p>}
            {!hasSWController && <p>Tip: refresh once to activate service worker, then try again.</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAndroidInstructions(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
