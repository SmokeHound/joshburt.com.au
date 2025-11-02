/**
 * Redis Cache Configuration (for production use)
 * 
 * This file provides a Redis-based cache implementation
 * that can replace the in-memory cache for production deployments.
 * 
 * To use Redis:
 * 1. Install ioredis: npm install ioredis
 * 2. Set REDIS_URL environment variable
 * 3. Update cache imports to use this file instead of utils/cache.js
 */

// Uncomment when ready to use Redis:
// const Redis = require('ioredis');

// Redis client configuration
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
const USE_REDIS = Boolean(REDIS_URL);

// Initialize Redis client (if configured)
let redisClient = null;
if (USE_REDIS) {
  // Uncomment when ready:
  // redisClient = new Redis(REDIS_URL, {
  //   maxRetriesPerRequest: 3,
  //   retryStrategy(times) {
  //     const delay = Math.min(times * 50, 2000);
  //     return delay;
  //   },
  //   tls: REDIS_URL.includes('rediss://') ? { rejectUnauthorized: false } : undefined
  // });
}

// Cache statistics (in-memory tracking)
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
};

/**
 * Generate cache key from components
 */
function generateKey(namespace, key) {
  const keyStr = typeof key === 'object' ? JSON.stringify(key) : String(key);
  return `${namespace}:${keyStr}`;
}

/**
 * Get value from cache (Redis or in-memory fallback)
 */
async function get(namespace, key) {
  if (!USE_REDIS) {
    // Fallback to in-memory cache
    return require('../utils/cache').get(namespace, key);
  }

  const cacheKey = generateKey(namespace, key);
  try {
    const value = await redisClient.get(cacheKey);
    if (value === null) {
      stats.misses++;
      return null;
    }
    stats.hits++;
    return JSON.parse(value);
  } catch (error) {
    console.error('Redis get error:', error);
    stats.misses++;
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
async function set(namespace, key, value, ttl = null) {
  if (!USE_REDIS) {
    // Fallback to in-memory cache
    return require('../utils/cache').set(namespace, key, value, ttl);
  }

  const cacheKey = generateKey(namespace, key);
  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redisClient.setex(cacheKey, ttl, serialized);
    } else {
      await redisClient.set(cacheKey, serialized);
    }
    stats.sets++;
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

/**
 * Delete value from cache
 */
async function del(namespace, key) {
  if (!USE_REDIS) {
    return require('../utils/cache').del(namespace, key);
  }

  const cacheKey = generateKey(namespace, key);
  try {
    const deleted = await redisClient.del(cacheKey);
    if (deleted > 0) {
      stats.deletes++;
    }
    return deleted > 0;
  } catch (error) {
    console.error('Redis del error:', error);
    return false;
  }
}

/**
 * Clear all cache entries in a namespace
 */
async function clearNamespace(namespace) {
  if (!USE_REDIS) {
    return require('../utils/cache').clearNamespace(namespace);
  }

  try {
    const pattern = `${namespace}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return 0;

    const deleted = await redisClient.del(...keys);
    stats.deletes += deleted;
    return deleted;
  } catch (error) {
    console.error('Redis clearNamespace error:', error);
    return 0;
  }
}

/**
 * Clear all cache entries
 */
async function clearAll() {
  if (!USE_REDIS) {
    return require('../utils/cache').clearAll();
  }

  try {
    await redisClient.flushdb();
  } catch (error) {
    console.error('Redis clearAll error:', error);
  }
}

/**
 * Get cache statistics
 */
function getStats() {
  if (!USE_REDIS) {
    return require('../utils/cache').getStats();
  }

  const hitRate = stats.hits + stats.misses > 0
    ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)
    : 0;

  return {
    ...stats,
    hitRate: `${hitRate}%`,
    type: 'redis'
  };
}

/**
 * Reset cache statistics
 */
function resetStats() {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.deletes = 0;
}

/**
 * Wrapper function to cache async function results
 */
async function wrap(namespace, key, fn, ttl = 300) {
  // Check cache first
  const cached = await get(namespace, key);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  await set(namespace, key, result, ttl);
  return result;
}

/**
 * Invalidate cache entries by pattern
 */
async function invalidate(namespace, pattern) {
  if (!USE_REDIS) {
    return require('../utils/cache').invalidate(namespace, pattern);
  }

  try {
    const prefix = `${namespace}:`;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    const allKeys = await redisClient.keys(`${prefix}*`);

    let count = 0;
    for (const fullKey of allKeys) {
      const keyPart = fullKey.substring(prefix.length);
      if (regex.test(keyPart)) {
        await redisClient.del(fullKey);
        count++;
      }
    }

    stats.deletes += count;
    return count;
  } catch (error) {
    console.error('Redis invalidate error:', error);
    return 0;
  }
}

/**
 * Close Redis connection (for cleanup)
 */
async function closeConnection() {
  if (redisClient) {
    await redisClient.quit();
  }
}

module.exports = {
  get,
  set,
  del,
  clearNamespace,
  clearAll,
  getStats,
  resetStats,
  wrap,
  invalidate,
  generateKey,
  close: closeConnection,
  isRedis: USE_REDIS
};
