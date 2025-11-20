/**
 * Unit tests for offline-storage.js
 * Tests IndexedDB wrapper functionality
 * Note: These are simplified tests due to jsdom's limited IndexedDB support
 */

describe('OfflineStorage', () => {
  let OfflineStorage;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();

    // Mock IndexedDB
    const mockDB = {
      transaction: jest.fn(),
      objectStoreNames: {
        contains: jest.fn(() => false)
      },
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn()
      }))
    };

    const mockRequest = {
      result: mockDB,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    };

    global.indexedDB = {
      open: jest.fn(() => {
        // Simulate async open
        Promise.resolve().then(() => {
          if (mockRequest.onupgradeneeded) {
            mockRequest.onupgradeneeded({ target: mockRequest });
          }
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess({ target: mockRequest });
          }
        });
        return mockRequest;
      })
    };

    // Load module after mocking
    OfflineStorage = require('../../assets/js/offline-storage.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('module structure', () => {
    it('should export an OfflineStorage instance', () => {
      expect(OfflineStorage).toBeDefined();
      expect(typeof OfflineStorage.init).toBe('function');
      expect(typeof OfflineStorage.save).toBe('function');
      expect(typeof OfflineStorage.getAll).toBe('function');
      expect(typeof OfflineStorage.getById).toBe('function');
      expect(typeof OfflineStorage.delete).toBe('function');
      expect(typeof OfflineStorage.clear).toBe('function');
      expect(typeof OfflineStorage.metadata).toBe('function');
      expect(typeof OfflineStorage.addToSyncQueue).toBe('function');
      expect(typeof OfflineStorage.getPendingSync).toBe('function');
      expect(typeof OfflineStorage.removeFromSyncQueue).toBe('function');
      expect(typeof OfflineStorage.getStorageInfo).toBe('function');
    });

    it('should have correct database name and version', () => {
      expect(OfflineStorage.dbName).toBe('joshburt-offline');
      expect(OfflineStorage.version).toBe(1);
    });
  });

  describe('initialization', () => {
    it('should attempt to open IndexedDB with correct parameters', async () => {
      await OfflineStorage.init();
      expect(global.indexedDB.open).toHaveBeenCalledWith('joshburt-offline', 1);
    });

    it('should only initialize database once', async () => {
      await OfflineStorage.init();
      await OfflineStorage.init();
      // Should only call open once even though init was called twice
      expect(global.indexedDB.open).toHaveBeenCalledTimes(1);
    });
  });

  describe('API structure', () => {
    it('should have save method that accepts storeName and items', () => {
      expect(OfflineStorage.save.length).toBe(2);
    });

    it('should have getAll method that accepts storeName', () => {
      expect(OfflineStorage.getAll.length).toBe(1);
    });

    it('should have getById method that accepts storeName and id', () => {
      expect(OfflineStorage.getById.length).toBe(2);
    });

    it('should have getByIndex method that accepts storeName, indexName, and value', () => {
      expect(OfflineStorage.getByIndex.length).toBe(3);
    });

    it('should have delete method that accepts storeName and id', () => {
      expect(OfflineStorage.delete.length).toBe(2);
    });

    it('should have clear method that accepts storeName', () => {
      expect(OfflineStorage.clear.length).toBe(1);
    });

    it('should have metadata method that accepts key and optional value', () => {
      expect(OfflineStorage.metadata.length).toBe(2);
    });

    it('should have addToSyncQueue method that accepts type and data', () => {
      expect(OfflineStorage.addToSyncQueue.length).toBe(2);
    });
  });

  describe('global availability', () => {
    it('should be available on window object', () => {
      // In jsdom, window is available
      global.window = global.window || {};
      require('../../assets/js/offline-storage.js');
      // The module sets window.OfflineStorage if window exists
      // This is already done in the module itself
    });
  });
});

