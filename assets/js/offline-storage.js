/**
 * Offline Storage Manager - IndexedDB wrapper for offline data persistence
 * Part of Phase 7.2: Offline Data Storage
 *
 * Provides a simple API for storing and retrieving data offline using IndexedDB.
 * Supports products, orders, and other catalog data for offline browsing.
 */

class OfflineStorage {
  constructor() {
    this.dbName = 'joshburt-offline';
    this.version = 1;
    this.db = null;
  }

  /**
   * Initialize the IndexedDB database
   * @returns {Promise<IDBDatabase>}
   */
  init() {
    if (this.db) {
      return Promise.resolve(this.db);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('code', 'code', { unique: false });
          productsStore.createIndex('type', 'type', { unique: false });
          productsStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Consumables store
        if (!db.objectStoreNames.contains('consumables')) {
          const consumablesStore = db.createObjectStore('consumables', { keyPath: 'id' });
          consumablesStore.createIndex('code', 'code', { unique: false });
          consumablesStore.createIndex('type', 'type', { unique: false });
          consumablesStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Filters store
        if (!db.objectStoreNames.contains('filters')) {
          const filtersStore = db.createObjectStore('filters', { keyPath: 'id' });
          filtersStore.createIndex('code', 'code', { unique: false });
          filtersStore.createIndex('type', 'type', { unique: false });
          filtersStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Offline orders (to be synced when online)
        if (!db.objectStoreNames.contains('offline_orders')) {
          const ordersStore = db.createObjectStore('offline_orders', {
            keyPath: 'local_id',
            autoIncrement: true
          });
          ordersStore.createIndex('created_at', 'created_at', { unique: false });
          ordersStore.createIndex('synced', 'synced', { unique: false });
        }

        // Sync queue for pending operations
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true
          });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Metadata store for tracking sync status
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save items to a store
   * @param {string} storeName - Name of the object store
   * @param {Array|Object} items - Item(s) to save
   */
  async save(storeName, items) {
    await this.init();
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    const itemsArray = Array.isArray(items) ? items : [items];

    for (const item of itemsArray) {
      // Add timestamp for tracking
      item.offline_cached_at = new Date().toISOString();
      store.put(item);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get all items from a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<Array>}
   */
  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a single item by ID
   * @param {string} storeName - Name of the object store
   * @param {number|string} id - Item ID
   * @returns {Promise<Object|null>}
   */
  async getById(storeName, id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get items by index
   * @param {string} storeName - Name of the object store
   * @param {string} indexName - Name of the index
   * @param {*} value - Value to search for
   * @returns {Promise<Array>}
   */
  async getByIndex(storeName, indexName, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete an item from a store
   * @param {string} storeName - Name of the object store
   * @param {number|string} id - Item ID
   */
  async delete(storeName, id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all items from a store
   * @param {string} storeName - Name of the object store
   */
  async clear(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get/set metadata
   * @param {string} key - Metadata key
   * @param {*} value - Value to set (omit to get)
   */
  async metadata(key, value) {
    await this.init();

    if (value === undefined) {
      // Get metadata
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('metadata', 'readonly');
        const store = tx.objectStore('metadata');
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => reject(request.error);
      });
    } else {
      // Set metadata
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction('metadata', 'readwrite');
        const store = tx.objectStore('metadata');
        const request = store.put({ key, value });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Add item to sync queue
   * @param {string} type - Operation type (create_order, update_product, etc.)
   * @param {Object} data - Data to sync
   */
  async addToSyncQueue(type, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const request = store.add({
        type,
        data,
        created_at: new Date().toISOString(),
        attempts: 0
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get pending sync items
   * @returns {Promise<Array>}
   */
  getPendingSync() {
    return this.getAll('sync_queue');
  }

  /**
   * Remove item from sync queue
   * @param {number} id - Sync item ID
   */
  removeFromSyncQueue(id) {
    return this.delete('sync_queue', id);
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>}
   */
  async getStorageInfo() {
    await this.init();

    const stores = ['products', 'consumables', 'filters', 'offline_orders', 'sync_queue'];
    const info = {};

    for (const storeName of stores) {
      const items = await this.getAll(storeName);
      info[storeName] = items.length;
    }

    // Get last sync time
    info.lastSync = await this.metadata('last_sync_time');

    return info;
  }
}

// Export singleton instance
const offlineStorage = new OfflineStorage();

// Make it available globally
if (typeof window !== 'undefined') {
  window.OfflineStorage = offlineStorage;
}

// Also export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = offlineStorage;
}
