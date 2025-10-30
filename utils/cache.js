/**
 * Simple in-memory caching utility for Netlify Functions
 * Can be extended to use Redis in production
 */

// In-memory cache store (per-instance, suitable for serverless with limited shared state)
const cache = new Map();

// Cache statistics for monitoring
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
};

/**
 * Generate cache key from components
 * @param {string} namespace - Cache namespace (e.g., 'products', 'settings')
 * @param {string|object} key - Cache key or object to be stringified
 * @returns {string} - Full cache key
 */
function generateKey(namespace, key) {
  const keyStr = typeof key === 'object' ? JSON.stringify(key) : String(key);
  return `${namespace}:${keyStr}`;
}

/**
 * Get value from cache
 * @param {string} namespace - Cache namespace
 * @param {string|object} key - Cache key
 * @returns {*} - Cached value or null if not found/expired
 */
function get(namespace, key) {
  const cacheKey = generateKey(namespace, key);
  const entry = cache.get(cacheKey);

  if (!entry) {
    stats.misses++;
    return null;
  }

  // Check if entry has expired
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    cache.delete(cacheKey);
    stats.misses++;
    return null;
  }

  stats.hits++;
  return entry.value;
}

/**
 * Set value in cache with optional TTL
 * @param {string} namespace - Cache namespace
 * @param {string|object} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 */
function set(namespace, key, value, ttl = null) {
  const cacheKey = generateKey(namespace, key);
  const entry = {
    value,
    expiresAt: ttl ? Date.now() + (ttl * 1000) : null,
    createdAt: Date.now()
  };

  cache.set(cacheKey, entry);
  stats.sets++;
}

/**
 * Delete value from cache
 * @param {string} namespace - Cache namespace
 * @param {string|object} key - Cache key
 * @returns {boolean} - True if deleted, false if not found
 */
function del(namespace, key) {
  const cacheKey = generateKey(namespace, key);
  const deleted = cache.delete(cacheKey);
  if (deleted) {
    stats.deletes++;
  }
  return deleted;
}

/**
 * Clear all cache entries in a namespace
 * @param {string} namespace - Cache namespace to clear
 * @returns {number} - Number of entries cleared
 */
function clearNamespace(namespace) {
  let count = 0;
  const prefix = `${namespace}:`;

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      count++;
    }
  }

  stats.deletes += count;
  return count;
}

/**
 * Clear all cache entries
 */
function clearAll() {
  const size = cache.size;
  cache.clear();
  stats.deletes += size;
}

/**
 * Get cache statistics
 * @returns {object} - Cache statistics
 */
function getStats() {
  const hitRate = stats.hits + stats.misses > 0
    ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)
    : 0;

  return {
    ...stats,
    size: cache.size,
    hitRate: `${hitRate}%`
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
 * @param {string} namespace - Cache namespace
 * @param {string|object} key - Cache key
 * @param {Function} fn - Async function to execute if cache miss
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<*>} - Cached or fresh result
 */
async function wrap(namespace, key, fn, ttl = 300) {
  // Check cache first
  const cached = get(namespace, key);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  set(namespace, key, result, ttl);
  return result;
}

/**
 * Invalidate cache entries by pattern
 * Useful for invalidating related cache entries on updates
 * @param {string} namespace - Cache namespace
 * @param {string|RegExp} pattern - Pattern to match keys
 * @returns {number} - Number of entries invalidated
 */
function invalidate(namespace, pattern) {
  let count = 0;
  const prefix = `${namespace}:`;
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      const keyPart = key.substring(prefix.length);
      if (regex.test(keyPart)) {
        cache.delete(key);
        count++;
      }
    }
  }

  stats.deletes += count;
  return count;
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
  generateKey
};
