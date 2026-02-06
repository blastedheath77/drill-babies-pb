const CACHE_NAME = 'pbstats-v0.1.0-4f6760a3';
const STATIC_CACHE_URLS = [
  '/',
  '/players',
  '/partnerships',
  '/head-to-head',
  '/log-game',
  '/statistics',
  '/tournaments',
  '/events',
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

// Push notifications for updates (tournaments, events, etc.)
self.addEventListener('push', (event) => {
  console.log('🔔 Push event received!', event);

  let notificationData = {
    title: 'PBStats',
    body: 'You have a new notification',
    type: 'general',
    url: '/'
  };

  // Try to parse the push data as JSON
  if (event.data) {
    console.log('📦 Push data:', event.data);
    try {
      const payload = event.data.json();
      console.log('📋 Parsed push data:', payload);

      // FCM sends data in a specific structure with 'notification' and 'data' fields
      const fcmNotification = payload.notification || {};
      const fcmData = payload.data || {};

      notificationData = {
        title: fcmNotification.title || fcmData.title || 'PBStats',
        body: fcmNotification.body || fcmData.body || 'You have a new notification',
        type: fcmData.type || 'general',
        url: fcmData.url || '/',
        eventId: fcmData.eventId,
        clubId: fcmData.clubId
      };

      console.log('✨ Extracted notification data:', notificationData);
    } catch (e) {
      console.log('⚠️ Failed to parse push data as JSON:', e);
      // If not JSON, use as plain text
      notificationData.body = event.data.text();
    }
  } else {
    console.log('⚠️ No data in push event');
  }

  console.log('📬 Showing notification:', notificationData);

  const options = {
    body: notificationData.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    tag: notificationData.type + '-' + (notificationData.eventId || Date.now()),
    renotify: true,
    data: {
      dateOfArrival: Date.now(),
      type: notificationData.type,
      url: notificationData.url,
      eventId: notificationData.eventId,
      clubId: notificationData.clubId
    },
    actions: [
      {
        action: 'view',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(() => {
        console.log('✅ Notification shown successfully');
      })
      .catch((error) => {
        console.error('❌ Failed to show notification:', error);
      })
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  let targetUrl = '/';

  // Determine target URL based on notification type
  if (event.action === 'dismiss') {
    return; // Just close the notification
  }

  if (notificationData.type === 'event' && notificationData.eventId) {
    targetUrl = '/events/' + notificationData.eventId;
  } else if (notificationData.type === 'tournament' && notificationData.url) {
    targetUrl = notificationData.url;
  } else if (notificationData.url) {
    targetUrl = notificationData.url;
  } else {
    // Default URLs based on type
    switch (notificationData.type) {
      case 'event':
        targetUrl = '/events';
        break;
      case 'tournament':
        targetUrl = '/tournaments';
        break;
      default:
        targetUrl = '/';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
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