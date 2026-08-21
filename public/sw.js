const CACHE_NAME = 'aether-static-v1';
const RUNTIME_CACHE_NAME = 'aether-runtime-v1';

// Only pre-cache minimal critical shells to guarantee service worker successfully installs
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

// Installation: cache minimal shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation: clean up legacy caches
self.addEventListener('activate', (event) => {
  const activeCaches = [CACHE_NAME, RUNTIME_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!activeCaches.includes(name)) {
            console.log('[SW] Cleaning old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interception
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests or requests to non-http/https schemes (e.g. chrome-extension, firebase/firestore websocket)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);

  // For Firestore, external firebase auth, or hot-reload / vite dev streams, don't force cache
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/node_modules/')
  ) {
    return;
  }

  // Strategy: Stale-While-Revalidate for JS, CSS, images, and other sub-resources
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background to keep the cache updated
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {/* Ignore background sync failures */});
        
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache dynamically
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful GET responses
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and requesting document, fallback to '/'
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline - Asset not found', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
    })
  );
});
