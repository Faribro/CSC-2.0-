// CSC 2.0 — Community Support Centre Offline PWA Service Worker
const CACHE_NAME = 'csc2-pwa-v1.0.0';
const PRECACHE_URLS = [
  '/',
  '/work',
  '/clients',
  '/clients/new',
  '/admin',
  '/manifest.json',
  '/alliance-india-logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache non-blocking partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests (POST, PUT, DELETE, PATCH) - strictly network-only
  if (request.method !== 'GET') return;

  // 2. Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // 3. Skip all API routes - API calls must remain strictly network-only to avoid stale data
  if (url.pathname.startsWith('/api/')) return;

  // 4. Handle navigation requests (HTML document requests)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request, { ignoreSearch: true });
          if (cachedResponse) return cachedResponse;

          // Route fallbacks
          if (url.pathname.startsWith('/clients/new')) {
            const newShell = await caches.match('/clients/new');
            if (newShell) return newShell;
          }
          if (url.pathname.startsWith('/clients')) {
            const clientsShell = await caches.match('/clients');
            if (clientsShell) return clientsShell;
          }
          if (url.pathname.startsWith('/work')) {
            const workShell = await caches.match('/work');
            if (workShell) return workShell;
          }

          const fallbackHome = await caches.match('/');
          if (fallbackHome) return fallbackHome;

          // Guaranteed offline fallback response
          return new Response(
            '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>CSC 2.0 - Offline Mode</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;padding:2rem;text-align:center;background:#FAF7F2;color:#2B2627"><h1>CSC 2.0 — Offline Mode</h1><p>You are currently offline. Your registered clients and draft follow-up visits remain safely stored on this device.</p></body></html>',
            {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' }),
            }
          );
        })
    );
    return;
  }

  // 5. Static assets: Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return networkResponse;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
