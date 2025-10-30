/**
 * Unit tests for cache utility
 */

const cache = require('../../utils/cache');

describe('Cache Utility', () => {
  beforeEach(() => {
    // Clear cache and reset stats before each test
    cache.clearAll();
    cache.resetStats();
  });

  describe('Basic operations', () => {
    test('should set and get values', () => {
      cache.set('test', 'key1', 'value1');
      const value = cache.get('test', 'key1');
      expect(value).toBe('value1');
    });

    test('should return null for non-existent keys', () => {
      const value = cache.get('test', 'nonexistent');
      expect(value).toBeNull();
    });

    test('should handle object values', () => {
      const obj = { foo: 'bar', baz: 123 };
      cache.set('test', 'obj', obj);
      const value = cache.get('test', 'obj');
      expect(value).toEqual(obj);
    });

    test('should delete values', () => {
      cache.set('test', 'key1', 'value1');
      const deleted = cache.del('test', 'key1');
      expect(deleted).toBe(true);
      expect(cache.get('test', 'key1')).toBeNull();
    });

    test('should return false when deleting non-existent key', () => {
      const deleted = cache.del('test', 'nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('TTL (Time to Live)', () => {
    test('should expire entries after TTL', async () => {
      cache.set('test', 'key1', 'value1', 0.1); // 100ms TTL
      expect(cache.get('test', 'key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cache.get('test', 'key1')).toBeNull();
    });

    test('should not expire entries without TTL', async () => {
      cache.set('test', 'key1', 'value1'); // No TTL
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('test', 'key1')).toBe('value1');
    });
  });

  describe('Namespace operations', () => {
    test('should clear all entries in a namespace', () => {
      cache.set('products', 'key1', 'value1');
      cache.set('products', 'key2', 'value2');
      cache.set('users', 'key1', 'value3');
      
      const cleared = cache.clearNamespace('products');
      
      expect(cleared).toBe(2);
      expect(cache.get('products', 'key1')).toBeNull();
      expect(cache.get('products', 'key2')).toBeNull();
      expect(cache.get('users', 'key1')).toBe('value3');
    });

    test('should isolate different namespaces', () => {
      cache.set('ns1', 'key', 'value1');
      cache.set('ns2', 'key', 'value2');
      
      expect(cache.get('ns1', 'key')).toBe('value1');
      expect(cache.get('ns2', 'key')).toBe('value2');
    });
  });

  describe('Statistics', () => {
    test('should track cache hits', () => {
      cache.set('test', 'key1', 'value1');
      cache.get('test', 'key1');
      cache.get('test', 'key1');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    test('should track cache misses', () => {
      cache.get('test', 'nonexistent');
      cache.get('test', 'another');
      
      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    test('should track sets', () => {
      cache.set('test', 'key1', 'value1');
      cache.set('test', 'key2', 'value2');
      
      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
    });

    test('should track deletes', () => {
      cache.set('test', 'key1', 'value1');
      cache.del('test', 'key1');
      
      const stats = cache.getStats();
      expect(stats.deletes).toBe(1);
    });

    test('should calculate hit rate', () => {
      cache.set('test', 'key1', 'value1');
      cache.get('test', 'key1'); // hit
      cache.get('test', 'key2'); // miss
      cache.get('test', 'key1'); // hit
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBe('66.67%');
    });

    test('should track cache size', () => {
      cache.set('test', 'key1', 'value1');
      cache.set('test', 'key2', 'value2');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    test('should reset statistics', () => {
      cache.set('test', 'key1', 'value1');
      cache.get('test', 'key1');
      cache.resetStats();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
    });
  });

  describe('Wrap function', () => {
    test('should cache function results', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'result';
      };
      
      const result1 = await cache.wrap('test', 'key1', fn, 60);
      const result2 = await cache.wrap('test', 'key1', fn, 60);
      
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(callCount).toBe(1); // Function called only once
    });

    test('should call function on cache miss', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      
      await cache.wrap('test', 'key1', fn, 60);
      
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should not call function on cache hit', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      
      await cache.wrap('test', 'key1', fn, 60);
      await cache.wrap('test', 'key1', fn, 60);
      
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Invalidate by pattern', () => {
    test('should invalidate entries matching string pattern', () => {
      cache.set('products', 'type:oil', 'value1');
      cache.set('products', 'type:filter', 'value2');
      cache.set('products', 'all', 'value3');
      
      const invalidated = cache.invalidate('products', 'type:');
      
      expect(invalidated).toBe(2);
      expect(cache.get('products', 'type:oil')).toBeNull();
      expect(cache.get('products', 'type:filter')).toBeNull();
      expect(cache.get('products', 'all')).toBe('value3');
    });

    test('should invalidate entries matching regex pattern', () => {
      cache.set('products', 'item-1', 'value1');
      cache.set('products', 'item-2', 'value2');
      cache.set('products', 'other', 'value3');
      
      const invalidated = cache.invalidate('products', /^item-/);
      
      expect(invalidated).toBe(2);
      expect(cache.get('products', 'item-1')).toBeNull();
      expect(cache.get('products', 'item-2')).toBeNull();
      expect(cache.get('products', 'other')).toBe('value3');
    });
  });

  describe('Key generation', () => {
    test('should generate consistent keys for same inputs', () => {
      const key1 = cache.generateKey('test', 'key');
      const key2 = cache.generateKey('test', 'key');
      expect(key1).toBe(key2);
    });

    test('should generate different keys for different namespaces', () => {
      const key1 = cache.generateKey('ns1', 'key');
      const key2 = cache.generateKey('ns2', 'key');
      expect(key1).not.toBe(key2);
    });

    test('should handle object keys', () => {
      const obj = { foo: 'bar' };
      const key1 = cache.generateKey('test', obj);
      const key2 = cache.generateKey('test', obj);
      expect(key1).toBe(key2);
    });
  });

  describe('Clear all', () => {
    test('should clear all cache entries', () => {
      cache.set('ns1', 'key1', 'value1');
      cache.set('ns2', 'key2', 'value2');
      cache.set('ns3', 'key3', 'value3');
      
      cache.clearAll();
      
      expect(cache.get('ns1', 'key1')).toBeNull();
      expect(cache.get('ns2', 'key2')).toBeNull();
      expect(cache.get('ns3', 'key3')).toBeNull();
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });
  });
});
