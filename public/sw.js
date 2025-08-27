const CACHE_NAME = 'pbstats-v0.1.0-c78f91d9';
const STATIC_CACHE_URLS = [
  '/',
  '/players',
  '/partnerships', 
  '/head-to-head',
  '/log-game',
  '/statistics',
  '/tournaments',
  '/manifest.json',
  // Add other static assets as needed
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing with cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Force activation of new service worker
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and notify about updates
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating with cache:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete all caches that don't match current version
            return cacheName.startsWith('pbstats-v') && cacheName !== CACHE_NAME;
          })
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // Take control of all clients immediately
      self.clients.claim();
      
      // Notify all clients about the update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            cacheName: CACHE_NAME
          });
        });
      });
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests to Firebase/Firestore and external APIs
  if (event.request.url.includes('firebaseapp.com') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('vercel.app') ||
      event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          // Check if this is a navigation request for an HTML page
          if (event.request.destination === 'document') {
            // For HTML pages, try to fetch fresh version in background
            fetch(event.request)
              .then((response) => {
                if (response && response.status === 200) {
                  // Update cache with fresh version
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, response.clone());
                  });
                }
              })
              .catch(() => {
                // Network failed, cached version is fine
              });
          }
          return cachedResponse;
        }

        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response to cache it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed, try to serve a fallback page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/') || new Response('App is offline', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            }
            throw new Error('Network failed and no cache available');
          });
      })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Force update check
    self.registration.update();
  }
});

// Background sync for offline game logging
self.addEventListener('sync', (event) => {
  if (event.tag === 'log-game') {
    event.waitUntil(
      // Get queued games from IndexedDB and sync them
      syncQueuedGames()
    );
  }
});

// Push notifications for tournament updates
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Tournament update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/action-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/action-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('PBStats', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/tournaments')
    );
  }
});

async function syncQueuedGames() {
  try {
    // Implementation would sync queued games from IndexedDB to Firebase
    // This is a placeholder for the actual sync logic
    console.log('Syncing queued games...');
    
    // In a real implementation, you would:
    // 1. Open IndexedDB
    // 2. Get queued game entries
    // 3. Try to submit them to Firebase
    // 4. Remove successfully synced entries
    // 5. Keep failed entries for retry
    
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to sync queued games:', error);
    throw error;
  }
}