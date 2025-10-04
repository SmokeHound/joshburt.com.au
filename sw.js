// Enhanced Service Worker for PWA offline functionality with performance optimizations
const STATIC_CACHE = 'joshburt-static-v3';
const DYNAMIC_CACHE = 'joshburt-dynamic-v3';
const API_CACHE = 'joshburt-api-v3';

const urlsToCache = [
  '/',
  '/index.html',
  '/administration.html',
  '/analytics.html',
  '/login.html', 
  '/oil.html',
  '/settings.html',
  '/users.html',
  '/shared-config.html',
  '/analytics-manager.js',
  '/admin-audit-logger.js',
  '/assets/css/styles.css',
  '/assets/images/avatar-placeholder.svg',
  '/assets/images/logo-placeholder.svg',
  '/manifest.json'
];

const apiUrls = [
  '/api/',
  'https://cdn.tailwindcss.com/',
  'https://cdn.jsdelivr.net/',
  'https://cdnjs.cloudflare.com/'
];

// Install event - cache resources with performance optimization
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(urlsToCache);
      }),
      // Initialize dynamic cache
      caches.open(DYNAMIC_CACHE),
      // Initialize API cache
      caches.open(API_CACHE)
    ]).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches with improved performance
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Remove old caches
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE && cache !== API_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Enhanced fetch event with intelligent caching strategies
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle different resource types with appropriate strategies
  if (isStaticResource(event.request.url)) {
    event.respondWith(cacheFirstStrategy(event.request, STATIC_CACHE));
  } else if (isAPIRequest(event.request.url)) {
    event.respondWith(networkFirstStrategy(event.request, API_CACHE));
  } else if (isHTMLRequest(event.request)) {
    event.respondWith(staleWhileRevalidateStrategy(event.request, DYNAMIC_CACHE));
  } else {
    event.respondWith(networkFirstStrategy(event.request, DYNAMIC_CACHE));
  }
});

// Cache-first strategy for static resources (CSS, JS, images)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    // Not in cache, fetch from network
    const response = await fetch(request);
    if (response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    return response;
  } catch (error) {
    console.error('Service Worker: Cache-first strategy failed', error);
    // Fallback for CSS/HTML
    if (request.url.endsWith('.css')) {
      return new Response('body { font-family: sans-serif; background: #fff; color: #222; }', { headers: { 'Content-Type': 'text/css' } });
    }
    if (request.headers.get('accept')?.includes('text/html')) {
      return new Response('<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Offline</h1><p>Unable to load page. Please check your connection and refresh.</p></body></html>', { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy for API calls and dynamic content
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      const responseClone = response.clone();
      
      // Cache with expiration (1 hour for API calls)
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      // Check if cache is expired (1 hour)
      const cacheTimestamp = cached.headers.get('sw-cache-timestamp');
      const isExpired = cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) > 3600000;
      
      if (!isExpired) {
        return cached;
      }
    }
    
    console.error('Service Worker: Network-first strategy failed', error);
    return new Response('Offline - No cached version available', { status: 503 });
  }
}

// Stale-while-revalidate strategy for HTML pages
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  // Serve from cache immediately if available
  const response = cached || fetch(request).catch(() => {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Offline</title></head>
        <body>
          <h1>You're offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });
  });
  // Update cache in background
  fetch(request).then(fetchResponse => {
    if (fetchResponse.status === 200) {
      cache.put(request, fetchResponse.clone());
    }
  }).catch(() => {
    // Network failed, cache update skipped
  });
  return response;
}

// Helper functions
function isStaticResource(url) {
  return /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i.test(url);
}

function isAPIRequest(url) {
  return apiUrls.some(apiUrl => url.includes(apiUrl)) || url.includes('/api/');
}

function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

// Enhanced background sync for offline actions
// Background sync removed: Service workers cannot access localStorage. Use IndexedDB or postMessage for offline sync if needed.

// Enhanced push notifications
// Push notification handler
self.addEventListener('push', event => {
  let options = {
    body: 'You have a new notification',
    icon: '/assets/images/logo-placeholder.svg',
    badge: '/assets/images/logo-placeholder.svg',
    vibrate: [200, 100, 200],
    data: { url: '/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' }
    ]
  };
  if (event.data) {
    try {
      const data = event.data.json();
      options = { ...options, ...data };
    } catch (err) {
      // Log error for debugging; can be removed in production
      console.error('Failed to parse notification data:', err);
    }
  }
  event.waitUntil(
    self.registration.showNotification('Josh\'s App', options)
  );
});

// Handle notification clicks
// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll().then(windowClients => {
      const client = windowClients.find(c => c.url.includes(url));
      if (client) {
        return client.focus();
      } else {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Performance monitoring
// Performance monitoring stub
self.addEventListener('message', event => {
  // No-op: performance metrics not logged in service worker
});