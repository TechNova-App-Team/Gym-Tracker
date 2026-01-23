const CACHE_NAME = 'gym-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Cache] Caching essential files');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Cache] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First with fallback to Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and other non-http protocols
  if (!url.protocol.startsWith('http')) {
    console.log('[Network] Skipping non-HTTP request:', url.protocol);
    return;
  }

  // Skip chrome extensions URLs explicitly
  if (url.href.includes('chrome-extension://')) {
    console.log('[Network] Skipping chrome-extension URL');
    return;
  }

  // Network first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Check if response is valid
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response before caching
        const responseToCache = response.clone();

        // Only cache GET requests to http/https URLs
        if (request.method === 'GET' && url.protocol.startsWith('http')) {
          caches.open(CACHE_NAME).then((cache) => {
            console.log('[Cache] Storing:', request.url);
            // Safely put only cacheable requests
            cache.put(request, responseToCache).catch((err) => {
              console.warn('[Cache] Failed to cache:', request.url, err.message);
            });
          });
        }

        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request).then((response) => {
          if (response) {
            console.log('[Cache] HIT:', request.url);
            return response;
          }

          // Return offline page or a generic response
          return new Response('Offline - Please check your internet connection', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

console.log('[Service Worker] Loaded and ready!');
