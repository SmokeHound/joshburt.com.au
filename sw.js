// Service Worker for PWA offline functionality
const CACHE_NAME = 'joshburt-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/analytics.html',
  '/login.html', 
  '/oil.html',
  '/settings.html',
  '/users.html',
  '/assets/css/styles.css',
  '/assets/images/avatar-placeholder.svg',
  '/assets/images/logo-placeholder.svg',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  console.log('Service Worker: Fetching', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Service Worker: Found in cache', event.request.url);
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Return offline page or fallback content
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Background sync for future enhancements
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);
  // Add background sync logic here for forms or data
});

// Push notifications for future enhancements
self.addEventListener('push', event => {
  console.log('Service Worker: Push message received');
  // Add push notification logic here
});