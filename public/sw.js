// Service Worker for Dreamland College Management System
// Implements offline-first caching strategy

const CACHE_NAME = 'dreamland-v1';
const STATIC_CACHE = 'dreamland-static-v1';
const DYNAMIC_CACHE = 'dreamland-dynamic-v1';
const OFFLINE_PAGE = '/offline.html';

// Resources to cache immediately (static assets)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/images.jfif',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[ServiceWorker] Cache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE && 
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // For API requests - network first, cache fallback for GET requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response for caching
          const responseClone = response.clone();
          
          // Only cache successful responses
          if (response.ok) {
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          
          return response;
        })
        .catch(async () => {
          // Network failed, try cache
          const cachedResponse = await caches.match(request);
          
          if (cachedResponse) {
            // Return cached response with warning header
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-Cached-Response', 'true');
            headers.set('X-Cached-Time', new Date().toISOString());
            
            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: headers
            });
          }
          
          // No cache available, return offline response for API calls
          return new Response(JSON.stringify({
            error: 'You are offline. Some features may not be available.',
            offline: true
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // For static assets - cache first, then network
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version, but update in background
            event.waitUntil(
              fetch(request)
                .then((response) => {
                  if (response.ok) {
                    caches.open(STATIC_CACHE)
                      .then((cache) => cache.put(request, response));
                  }
                })
                .catch(() => {})
            );
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              const responseClone = response.clone();
              
              if (response.ok) {
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              
              return response;
            })
            .catch(() => {
              // If it's an image, return a placeholder
              if (request.destination === 'image') {
                return caches.match('/images.jfif');
              }
              return caches.match(OFFLINE_PAGE);
            });
        })
    );
    return;
  }

  // For HTML pages - network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        
        if (response.ok) {
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If navigating to a page, return offline page
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
        
        return new Response('Offline', { status: 503 });
      })
  );
});

// Helper function to check if asset is static
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.html', '.htm', '.json',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.jfif', '.webp',
    '.woff', '.woff2', '.ttf', '.eot',
    '.map', '.wasm'
  ];
  
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname === '/' ||
         pathname.startsWith('/assets/');
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
        .then(() => {
          return self.clients.matchAll()
            .then((clients) => {
              clients.forEach((client) => {
                client.postMessage({ type: 'CACHE_CLEARED' });
              });
            });
        })
    );
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});

// Background sync for offline form submissions (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-form-data') {
    event.waitUntil(syncFormData());
  }
});

async function syncFormData() {
  // Get pending form data from IndexedDB or other storage
  // This would be implemented with the main app
  console.log('[ServiceWorker] Syncing form data...');
}

// Push notifications (if implemented later)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Dreamland College';
  const options = {
    body: data.body || 'New notification',
    icon: '/images.jfif',
    badge: '/images.jfif',
    vibrate: [100, 50, 100],
    data: data.url || '/dashboard',
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === event.notification.data && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data);
          }
        })
    );
  }
});
