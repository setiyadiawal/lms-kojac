const CACHE_PREFIX = 'kojac-pwa-';
const CACHE_VERSION = 'v1.2-phase2';
const SHELL_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-assets`;

const APP_SHELL_URL = '/';
const CORE_FILES = [
  APP_SHELL_URL,
  '/manifest.webmanifest',
  '/pwa-192.png',
  '/pwa-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX))
          .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(APP_SHELL_URL, response.clone());
    }

    return response;
  } catch {
    const cached = await caches.match(APP_SHELL_URL);
    if (cached) return cached;

    return new Response(
      '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KOJAC LMS</title><body><main style="font-family:system-ui;padding:32px"><h1>KOJAC LMS</h1><p>Koneksi internet tidak tersedia. Sambungkan kembali internet lalu coba lagi.</p></main></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept Supabase, Google Drive, OAuth, or any other third-party request.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Vite production assets are content-hashed. Public KOJAC assets under /assets/
  // are also safe to cache locally. Data/API requests are intentionally excluded.
  if (
    url.pathname.startsWith('/assets/')
    || url.pathname === '/pwa-192.png'
    || url.pathname === '/pwa-512.png'
  ) {
    event.respondWith(cacheFirstStatic(request));
  }
});
