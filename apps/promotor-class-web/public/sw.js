// Ralivo Promotor Class PWA Service Worker
const CACHE_NAME = 'ralivo-class-pwa-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/learn',
  '/masuk',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith('ralivo-class-pwa-')) {
            return caches.delete(key);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin or chrome-extension schemes
  if (!url.protocol.startsWith('http')) return;

  // Stale-while-revalidate for navigation & static assets
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const networkFetch = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
