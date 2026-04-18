const CACHE_NAME = 'aether-v2';
const PRE_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Strategy: Cache-First for Media, Stale-While-Revalidate for others
  const isMedia = event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp|mp4|webm|ogg)$/i) || 
                  event.request.url.includes('firebasestorage.googleapis.com') ||
                  event.request.url.includes('picsum.photos') ||
                  event.request.url.includes('images.unsplash.com');
  
  const isLocalAsset = event.request.url.startsWith(self.location.origin);

  if (!isLocalAsset && !isMedia) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // If it's media and we have it in cache, return immediately (Cache-First)
        if (isMedia && cachedResponse) {
          return cachedResponse;
        }

        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);
        
        return cachedResponse || fetchPromise;
      });
    })
  );
});
