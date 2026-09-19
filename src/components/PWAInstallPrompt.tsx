import { useEffect, useMemo, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

const DISMISS_KEY = 'kojac:pwa-install-dismissed-at';
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasDismissedRecently() {
  try {
    const value = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Number.isFinite(value) && value > 0 && Date.now() - value < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function saveDismissedAt() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // localStorage can be unavailable in privacy-restricted browsers.
  }
}

function clearDismissedAt() {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    // No action required.
  }
}

export function PWAInstallPrompt() {
  const location = useLocation();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(() => wasDismissedRecently());
  const [showIosHelp, setShowIosHelp] = useState(false);

  const hideOnAuthPage = useMemo(
    () => ['/login', '/verify-email', '/pending'].includes(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      clearDismissedAt();
      setInstalled(true);
      setInstallEvent(null);
      setShowIosHelp(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || dismissed || hideOnAuthPage) return null;

  const iosFallback = isIos() && !installEvent;
  if (!installEvent && !iosFallback) return null;

  const dismiss = () => {
    saveDismissedAt();
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) {
      setShowIosHelp(true);
      return;
    }

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;

      if (choice.outcome === 'accepted') {
        clearDismissedAt();
      }

      setInstallEvent(null);
    } catch (error) {
      console.error('KOJAC PWA install prompt failed', error);
    }
  };

  return (
    <aside className="pwa-install-card" role="status" aria-label="Install KOJAC LMS">
      <button
        type="button"
        className="pwa-install-close"
        aria-label="Tutup"
        onClick={dismiss}
      >
        <X size={17}/>
      </button>

      <div className="pwa-install-icon" aria-hidden="true">
        <img src="/brand/kojac-app-192.png" alt=""/>
      </div>

      <div className="pwa-install-copy">
        <strong>Install KOJAC LMS</strong>
        <span>
          Buka KOJAC seperti aplikasi langsung dari layar utama perangkat Anda.
        </span>

        {showIosHelp && (
          <span className="pwa-install-ios-help">
            <Share2 size={14}/>
            Di iPhone/iPad: tekan Bagikan lalu pilih “Tambahkan ke Layar Utama”.
          </span>
        )}
      </div>

      <button type="button" className="pwa-install-action" onClick={() => void install()}>
        <Download size={16}/>
        {iosFallback ? 'Cara Install' : 'Install'}
      </button>
    </aside>
  );
}
