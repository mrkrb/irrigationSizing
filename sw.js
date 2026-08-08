const CACHE_NAME = 'irrigation-sizer-v1.6.7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/calc.js',
  './js/storage.js',
  './js/io.js',
  './js/version.js',
  './manifest.json',
  './icons/icon.svg'
];

// Install: cache all static assets, then immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean ALL old caches, then take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST strategy
// Try network first. If online, always serve fresh content and update cache.
// If offline, fall back to cache.
self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Got a fresh response — update the cache and return it
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // Network failed — serve from cache (offline mode)
        return caches.match(event.request);
      })
  );
});
