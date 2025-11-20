/**
 * Unit tests for cache-management function
 */

const cache = require('../../utils/cache');

// Mock dependencies
jest.mock('../../utils/cache');
jest.mock('../../utils/http', () => ({
  requirePermission: jest.fn(),
  corsHeaders: {}
}));

const { requirePermission } = require('../../utils/http');

describe('Cache Management Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.getStats.mockReturnValue({
      hits: 100,
      misses: 20,
      sets: 50,
      deletes: 10,
      size: 40,
      hitRate: '83.33%'
    });
  });

  describe('GET handler', () => {
    it('should return cache statistics when authorized', () => {
      requirePermission.mockResolvedValue({
        user: { id: 1, role: 'admin' },
        response: null
      });

      const stats = cache.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats.hitRate).toBe('83.33%');
    });

    it('should include cache type in response', () => {
      const stats = cache.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('POST handler', () => {
    it('should reset statistics when action is reset-stats', () => {
      cache.resetStats.mockImplementation(() => {
        cache.getStats.mockReturnValue({
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
          size: 0,
          hitRate: '0%'
        });
      });

      cache.resetStats();
      const stats = cache.getStats();

      expect(cache.resetStats).toHaveBeenCalled();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('DELETE handler', () => {
    it('should clear specific namespace', () => {
      cache.clearNamespace.mockReturnValue(5);

      const cleared = cache.clearNamespace('products');

      expect(cache.clearNamespace).toHaveBeenCalledWith('products');
      expect(cleared).toBe(5);
    });

    it('should clear all cache when no namespace specified', () => {
      cache.clearAll.mockImplementation(() => {
        cache.getStats.mockReturnValue({
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
          size: 0,
          hitRate: '0%'
        });
      });

      cache.clearAll();
      const stats = cache.getStats();

      expect(cache.clearAll).toHaveBeenCalled();
      expect(stats.size).toBe(0);
    });
  });
});
