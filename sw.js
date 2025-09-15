// Enhanced Service Worker for PWA offline functionality with performance optimizations
const CACHE_NAME = 'joshburt-v2';
const STATIC_CACHE = 'joshburt-static-v2';
const DYNAMIC_CACHE = 'joshburt-dynamic-v2';
const API_CACHE = 'joshburt-api-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
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
  console.log('Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(urlsToCache);
      }),
      // Initialize dynamic cache
      caches.open(DYNAMIC_CACHE),
      // Initialize API cache
      caches.open(API_CACHE)
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches with improved performance
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Remove old caches
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE && cache !== API_CACHE) {
            console.log('Service Worker: Clearing old cache', cache);
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
      console.log('Service Worker: Serving from cache', request.url);
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
        console.log('Service Worker: Serving from cache (network failed)', request.url);
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
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'order-sync') {
    event.waitUntil(syncPendingOrders());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalyticsData());
  }
});

async function syncPendingOrders() {
  try {
    const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    
    for (const order of pendingOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });
        
        if (response.ok) {
          // Remove synced order from pending
          const updatedPending = pendingOrders.filter(p => p.id !== order.id);
          localStorage.setItem('pendingOrders', JSON.stringify(updatedPending));
        }
      } catch (error) {
        console.warn('Failed to sync order:', order.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncAnalyticsData() {
  try {
    const analyticsData = localStorage.getItem('analyticsData');
    if (analyticsData) {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: analyticsData
      });
    }
  } catch (error) {
    console.warn('Analytics sync failed:', error);
  }
}

// Enhanced push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push message received');
  
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
    const data = event.data.json();
    options = { ...options, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Josh\'s App', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll().then(clients => {
        // Check if app is already open
        const client = clients.find(c => c.url.includes(url));
        if (client) {
          return client.focus();
        } else {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Performance monitoring
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PERFORMANCE_MEASURE') {
    // Log performance metrics
    console.log('Performance measure:', event.data.name, event.data.duration);
  }
});