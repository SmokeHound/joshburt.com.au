/**
 * Offline Sync Manager - Background synchronization for offline operations
 * Part of Phase 7.2: Offline Data Storage
 *
 * Handles syncing offline data to the server when connection is restored.
 * Provides conflict resolution and retry logic.
 */

class OfflineSyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.FN_BASE = window.FN_BASE || '/.netlify/functions';
    this.listeners = [];

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Register background sync if available
    this.registerBackgroundSync();
  }

  /**
   * Handle coming online
   */
  handleOnline() {
    console.log('[OfflineSync] Connection restored');
    this.isOnline = true;
    this.updateUI();

    // Trigger sync after a short delay
    setTimeout(() => this.sync(), 1000);
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    console.log('[OfflineSync] Connection lost');
    this.isOnline = false;
    this.updateUI();
  }

  /**
   * Update UI to show online/offline status
   */
  updateUI() {
    // Notify all listeners
    this.listeners.forEach(callback => callback(this.isOnline));

    // Update status indicator if it exists
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      if (this.isOnline) {
        indicator.classList.add('hidden');
      } else {
        indicator.classList.remove('hidden');
      }
    }
  }

  /**
   * Add a status change listener
   * @param {Function} callback - Called with online status (boolean)
   */
  addStatusListener(callback) {
    this.listeners.push(callback);
    // Call immediately with current status
    callback(this.isOnline);
  }

  /**
   * Remove a status change listener
   * @param {Function} callback
   */
  removeStatusListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Register background sync with service worker
   */
  async registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('offline-sync');
        console.log('[OfflineSync] Background sync registered');
      } catch (error) {
        console.warn('[OfflineSync] Background sync not available:', error);
      }
    }
  }

  /**
   * Main sync function - syncs all pending operations
   * @returns {Promise<Object>} Sync results
   */
  async sync() {
    if (this.syncInProgress) {
      console.log('[OfflineSync] Sync already in progress');
      return { skipped: true };
    }

    if (!this.isOnline) {
      console.log('[OfflineSync] Cannot sync - offline');
      return { offline: true };
    }

    this.syncInProgress = true;
    console.log('[OfflineSync] Starting sync...');

    const results = {
      orders: { success: 0, failed: 0 },
      data: { success: 0, failed: 0 },
      errors: []
    };

    try {
      // Get pending sync items
      const pendingItems = await window.OfflineStorage.getPendingSync();
      console.log(`[OfflineSync] Found ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);

          // Remove from queue on success
          await window.OfflineStorage.removeFromSyncQueue(item.id);

          if (item.type.includes('order')) {
            results.orders.success++;
          } else {
            results.data.success++;
          }
        } catch (error) {
          console.error('[OfflineSync] Failed to sync item:', item.id, error);
          results.errors.push({ item: item.id, error: error.message });

          if (item.type.includes('order')) {
            results.orders.failed++;
          } else {
            results.data.failed++;
          }

          // Increment attempt counter
          if (item.attempts >= 3) {
            console.warn('[OfflineSync] Max attempts reached, removing item:', item.id);
            await window.OfflineStorage.removeFromSyncQueue(item.id);
          }
        }
      }

      // Update last sync time
      await window.OfflineStorage.metadata('last_sync_time', new Date().toISOString());

      console.log('[OfflineSync] Sync complete:', results);
      return results;
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
      results.errors.push({ error: error.message });
      return results;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a single item
   * @param {Object} item - Sync queue item
   */
  syncItem(item) {
    const { type, data } = item;

    switch (type) {
    case 'create_order':
      return this.syncCreateOrder(data);

    case 'update_order':
      return this.syncUpdateOrder(data);

    case 'create_product':
      return this.syncCreateProduct(data);

    case 'update_product':
      return this.syncUpdateProduct(data);

    default:
      throw new Error(`Unknown sync type: ${type}`);
    }
  }

  /**
   * Sync order creation
   * @param {Object} orderData - Order data
   */
  async syncCreateOrder(orderData) {
    const token = localStorage.getItem('accessToken');
    if (!token) {throw new Error('Not authenticated');}

    const response = await fetch(`${this.FN_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create order');
    }

    const result = await response.json();
    console.log('[OfflineSync] Order created:', result);

    // Mark offline order as synced
    if (orderData.local_id) {
      const offlineOrder = await window.OfflineStorage.getById(
        'offline_orders',
        orderData.local_id
      );
      if (offlineOrder) {
        offlineOrder.synced = true;
        offlineOrder.server_id = result.id;
        await window.OfflineStorage.save('offline_orders', offlineOrder);
      }
    }

    return result;
  }

  /**
   * Sync order update
   * @param {Object} orderData - Order data
   */
  async syncUpdateOrder(orderData) {
    const token = localStorage.getItem('accessToken');
    if (!token) {throw new Error('Not authenticated');}

    const response = await fetch(`${this.FN_BASE}/orders`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update order');
    }

    return response.json();
  }

  /**
   * Sync product creation
   * @param {Object} productData - Product data
   */
  async syncCreateProduct(productData) {
    const token = localStorage.getItem('accessToken');
    if (!token) {throw new Error('Not authenticated');}

    const response = await fetch(`${this.FN_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create product');
    }

    return response.json();
  }

  /**
   * Sync product update
   * @param {Object} productData - Product data
   */
  async syncUpdateProduct(productData) {
    const token = localStorage.getItem('accessToken');
    if (!token) {throw new Error('Not authenticated');}

    const response = await fetch(`${this.FN_BASE}/products`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update product');
    }

    return response.json();
  }

  /**
   * Cache catalog data for offline use
   * @param {string} type - Data type (products, consumables, filters)
   */
  async cacheData(type) {
    if (!this.isOnline) {
      console.log('[OfflineSync] Cannot cache - offline');
      return 0;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const endpoint = `${this.FN_BASE}/${type}`;

      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${type}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : data[type] || [];

      await window.OfflineStorage.save(type, items);
      console.log(`[OfflineSync] Cached ${items.length} ${type}`);

      return items.length;
    } catch (error) {
      console.error(`[OfflineSync] Failed to cache ${type}:`, error);
      throw error;
    }
  }

  /**
   * Get cached data or fetch from server
   * @param {string} type - Data type
   * @returns {Promise<Array>}
   */
  async getData(type) {
    try {
      if (this.isOnline) {
        // Try to fetch fresh data
        await this.cacheData(type);
      }
    } catch (error) {
      console.warn(`[OfflineSync] Using cached ${type} due to error:`, error);
    }

    // Return cached data
    return window.OfflineStorage.getAll(type);
  }

  /**
   * Create an offline order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>}
   */
  async createOfflineOrder(orderData) {
    // Add to offline orders store
    const offlineOrder = {
      ...orderData,
      created_at: new Date().toISOString(),
      synced: false
    };

    await window.OfflineStorage.save('offline_orders', offlineOrder);

    // Add to sync queue
    await window.OfflineStorage.addToSyncQueue('create_order', offlineOrder);

    console.log('[OfflineSync] Offline order created, will sync when online');

    // Try to sync immediately if online
    if (this.isOnline) {
      setTimeout(() => this.sync(), 100);
    }

    return offlineOrder;
  }
}

// Export singleton instance
const offlineSyncManager = new OfflineSyncManager();

// Make it available globally
if (typeof window !== 'undefined') {
  window.OfflineSyncManager = offlineSyncManager;
}

// Also export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = offlineSyncManager;
}
