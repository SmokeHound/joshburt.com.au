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

// Best-effort persistence of cache stats to Postgres.
// In serverless environments, in-memory cache is per-function-instance, so persisting counters
// is the only reliable way for the Cache Monitor page to show meaningful values.
const _persist = {
  pending: { hits: 0, misses: 0, sets: 0, deletes: 0 },
  flushTimer: null,
  lastErrorAt: 0
};

function _queuePersist(delta) {
  try {
    _persist.pending.hits += delta.hits || 0;
    _persist.pending.misses += delta.misses || 0;
    _persist.pending.sets += delta.sets || 0;
    _persist.pending.deletes += delta.deletes || 0;

    if (_persist.flushTimer) {
      return;
    }
    const delayMs = Math.max(500, parseInt(process.env.CACHE_STATS_FLUSH_MS || '5000', 10) || 5000);
    _persist.flushTimer = setTimeout(_flushPersistedStats, delayMs);
    // Allow process to exit without waiting on the timer (Node only)
    if (_persist.flushTimer && typeof _persist.flushTimer.unref === 'function') {
      _persist.flushTimer.unref();
    }
  } catch (_) {
    // no-op
  }
}

async function _flushPersistedStats() {
  const delta = _persist.pending;
  _persist.pending = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  _persist.flushTimer = null;

  if (!delta.hits && !delta.misses && !delta.sets && !delta.deletes) {
    return;
  }

  try {
    // Lazy import to avoid pulling DB into non-server contexts.
    const { database } = require('../config/database');
    try {
      // Best-effort connect (connect is idempotent)
      await database.connect();
    } catch (_) {
      return;
    }

    if (!database.pool) {
      return;
    }

    await database.pool.query(
      `INSERT INTO cache_stats (id, hits, misses, sets, deletes, updated_at)
       VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         hits = cache_stats.hits + EXCLUDED.hits,
         misses = cache_stats.misses + EXCLUDED.misses,
         sets = cache_stats.sets + EXCLUDED.sets,
         deletes = cache_stats.deletes + EXCLUDED.deletes,
         updated_at = CURRENT_TIMESTAMP`,
      [delta.hits, delta.misses, delta.sets, delta.deletes]
    );
  } catch (e) {
    // Avoid noisy logs on every request if schema isn't migrated yet.
    const now = Date.now();
    if (now - _persist.lastErrorAt > 60_000) {
      _persist.lastErrorAt = now;
      console.warn('Cache stats persistence skipped:', e && e.message ? e.message : e);
    }
  }
}

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
    _queuePersist({ misses: 1 });
    return null;
  }

  // Check if entry has expired
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    cache.delete(cacheKey);
    stats.misses++;
    _queuePersist({ misses: 1, deletes: 1 });
    return null;
  }

  stats.hits++;
  _queuePersist({ hits: 1 });
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
    expiresAt: ttl ? Date.now() + ttl * 1000 : null,
    createdAt: Date.now()
  };

  cache.set(cacheKey, entry);
  stats.sets++;
  _queuePersist({ sets: 1 });
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
    _queuePersist({ deletes: 1 });
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
  if (count) {
    _queuePersist({ deletes: count });
  }
  return count;
}

/**
 * Clear all cache entries
 */
function clearAll() {
  const size = cache.size;
  cache.clear();
  stats.deletes += size;
  if (size) {
    _queuePersist({ deletes: size });
  }
}

/**
 * Get cache statistics
 * @returns {object} - Cache statistics
 */
function getStats() {
  const hitRate =
    stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
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
