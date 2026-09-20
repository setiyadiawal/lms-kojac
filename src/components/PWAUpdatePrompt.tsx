import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { RefreshCw } from 'lucide-react';
import {
  getBackgroundUploadSnapshot,
  subscribeBackgroundUpload,
} from '../features/recordings/backgroundRecordingUpload';

type VersionPayload = {
  buildId?: string;
  builtAt?: string;
};

const VERSION_URL = '/version.json';
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const DISMISS_KEY = 'kojac:pwa-update-dismissed-at';
const DISMISS_FOR_MS = 30 * 60 * 1000;
const RELOAD_GUARD_KEY = 'kojac:pwa-update-reload-at';
const RELOAD_GUARD_MS = 10 * 1000;

function readSessionNumber(key: string) {
  try {
    const value = Number(sessionStorage.getItem(key) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeSessionNumber(key: string, value: number) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
}

function dismissRemainingMs() {
  const dismissedAt = readSessionNumber(DISMISS_KEY);
  if (!dismissedAt) return 0;
  return Math.max(0, DISMISS_FOR_MS - (Date.now() - dismissedAt));
}

function reloadOnce() {
  const lastReload = readSessionNumber(RELOAD_GUARD_KEY);

  if (lastReload && Date.now() - lastReload < RELOAD_GUARD_MS) {
    return;
  }

  writeSessionNumber(RELOAD_GUARD_KEY, Date.now());
  window.location.reload();
}

async function fetchRemoteVersion() {
  const response = await fetch(VERSION_URL, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Version check gagal (${response.status}).`);
  }

  const payload = await response.json() as VersionPayload;
  return typeof payload.buildId === 'string' ? payload.buildId : '';
}

async function waitForWaitingWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs = 3000,
) {
  if (registration.waiting) return registration.waiting;

  const installing = registration.installing;
  if (!installing) return null;

  if (installing.state === 'installed') {
    return registration.waiting ?? installing;
  }

  return new Promise<ServiceWorker | null>((resolve) => {
    let finished = false;

    const finish = (worker: ServiceWorker | null) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      installing.removeEventListener('statechange', onStateChange);
      resolve(worker);
    };

    const onStateChange = () => {
      if (installing.state === 'installed') {
        finish(registration.waiting ?? installing);
      } else if (installing.state === 'redundant') {
        finish(registration.waiting);
      }
    };

    const timer = window.setTimeout(
      () => finish(registration.waiting),
      timeoutMs,
    );

    installing.addEventListener('statechange', onStateChange);
  });
}

export function PWAUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [remoteBuildId, setRemoteBuildId] = useState('');
  const [dismissed, setDismissed] = useState(() => dismissRemainingMs() > 0);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  const uploadState = useSyncExternalStore(
    subscribeBackgroundUpload,
    getBackgroundUploadSnapshot,
    getBackgroundUploadSnapshot,
  );

  const uploadActive = uploadState.job?.status === 'uploading';
  const buildChanged = Boolean(
    remoteBuildId && remoteBuildId !== __KOJAC_BUILD_ID__,
  );
  const updateAvailable = Boolean(waitingWorker || buildChanged);

  const checkRemoteVersion = useCallback(async (
    currentRegistration?: ServiceWorkerRegistration | null,
  ) => {
    try {
      const nextBuildId = await fetchRemoteVersion();
      if (!nextBuildId) return;

      setRemoteBuildId(nextBuildId);

      if (nextBuildId !== __KOJAC_BUILD_ID__ && currentRegistration) {
        void currentRegistration.update().catch(() => {
          // A build can still be updated by reload even when SW update checking fails.
        });
      }
    } catch {
      // Offline/version endpoint failure must never interrupt the LMS.
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

    let active = true;
    let currentRegistration: ServiceWorkerRegistration | null = null;

    const onUpdateFound = () => {
      const worker = currentRegistration?.installing;
      if (!worker) return;

      const onStateChange = () => {
        if (
          worker.state === 'installed'
          && navigator.serviceWorker.controller
          && active
        ) {
          setWaitingWorker(currentRegistration?.waiting ?? worker);
        }
      };

      worker.addEventListener('statechange', onStateChange);
    };

    const register = async () => {
      try {
        const nextRegistration = await navigator.serviceWorker.register(
          '/sw.js',
          { scope: '/' },
        );

        if (!active) return;

        currentRegistration = nextRegistration;
        setRegistration(nextRegistration);

        if (nextRegistration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(nextRegistration.waiting);
        }

        nextRegistration.addEventListener('updatefound', onUpdateFound);

        await checkRemoteVersion(nextRegistration);

        void nextRegistration.update().catch(() => {
          // Network/update check failures are non-fatal.
        });
      } catch (error) {
        console.error('KOJAC service worker registration failed', error);
      }
    };

    if (document.readyState === 'complete') {
      void register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      active = false;
      window.removeEventListener('load', register);
      currentRegistration?.removeEventListener('updatefound', onUpdateFound);
    };
  }, [checkRemoteVersion]);

  useEffect(() => {
    if (!registration) return;

    const check = () => {
      void checkRemoteVersion(registration);
      void registration.update().catch(() => {
        // Keep the current app running when update checking is temporarily unavailable.
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check();
    };

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [registration, checkRemoteVersion]);

  useEffect(() => {
    if (!dismissed) return;

    const remaining = dismissRemainingMs();
    if (remaining <= 0) {
      setDismissed(false);
      return;
    }

    const timer = window.setTimeout(() => setDismissed(false), remaining);
    return () => window.clearTimeout(timer);
  }, [dismissed]);

  useEffect(() => {
    if (updateAvailable) {
      document.documentElement.classList.add('pwa-update-available');
    } else {
      document.documentElement.classList.remove('pwa-update-available');
    }

    return () => {
      document.documentElement.classList.remove('pwa-update-available');
    };
  }, [updateAvailable]);

  if (!updateAvailable || dismissed) return null;

  const dismiss = () => {
    writeSessionNumber(DISMISS_KEY, Date.now());
    setDismissed(true);
    setMessage('');
  };

  const applyUpdate = async () => {
    if (uploadActive) {
      setMessage(
        'Upload video masih berjalan. Tunggu hingga upload selesai sebelum memperbarui aplikasi.',
      );
      return;
    }

    if (updating) return;

    setUpdating(true);
    setMessage('');

    try {
      const currentRegistration = registration
        ?? await navigator.serviceWorker.getRegistration('/');

      if (currentRegistration) {
        try {
          await currentRegistration.update();
        } catch {
          // A version-only application update can still be applied by reloading.
        }

        const worker = currentRegistration.waiting
          ?? waitingWorker
          ?? await waitForWaitingWorker(currentRegistration);

        if (worker && navigator.serviceWorker.controller) {
          let reloadScheduled = false;

          const scheduleReload = () => {
            if (reloadScheduled) return;
            reloadScheduled = true;
            reloadOnce();
          };

          navigator.serviceWorker.addEventListener(
            'controllerchange',
            scheduleReload,
            { once: true },
          );

          worker.postMessage({ type: 'SKIP_WAITING' });

          // Fallback in case a browser does not emit controllerchange as expected.
          window.setTimeout(scheduleReload, 4000);
          return;
        }
      }

      // No waiting SW means only the application bundle changed.
      // Navigation is network-first, so a reload safely receives the new build.
      reloadOnce();
    } catch (error) {
      console.error('KOJAC PWA update failed', error);
      setUpdating(false);
      setMessage('Update belum dapat diterapkan. Coba lagi beberapa saat lagi.');
    }
  };

  return (
    <aside
      className="pwa-update-card"
      role="status"
      aria-live="polite"
      aria-label="Update KOJAC LMS"
    >
      <div className="pwa-update-icon" aria-hidden="true">
        <RefreshCw size={21}/>
      </div>

      <div className="pwa-update-copy">
        <strong>Update KOJAC LMS</strong>
        <span>
          Versi baru tersedia. Simpan pekerjaan Anda, lalu perbarui aplikasi.
        </span>

        {uploadActive && (
          <span className="pwa-update-warning">
            Upload video sedang berjalan. Update akan tersedia setelah upload selesai.
          </span>
        )}

        {message && (
          <span className="pwa-update-warning" role="alert">
            {message}
          </span>
        )}

        <div className="pwa-update-actions">
          <button
            type="button"
            className="pwa-update-later"
            onClick={dismiss}
            disabled={updating}
          >
            Nanti
          </button>
          <button
            type="button"
            className="pwa-update-action"
            onClick={() => void applyUpdate()}
            disabled={updating || uploadActive}
          >
            <RefreshCw size={15} className={updating ? 'is-spinning' : undefined}/>
            {updating ? 'Memperbarui…' : uploadActive ? 'Tunggu Upload' : 'Update Sekarang'}
          </button>
        </div>
      </div>
    </aside>
  );
}
