// Netlify Function: Cache Management API /.netlify/functions/cache-management
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const cache = require('../../utils/cache');
const { database } = require('../../config/database');

exports.handler = withHandler(async function (event) {
  const method = event.httpMethod;

  if (method === 'GET') return handleGet(event);
  if (method === 'POST') return handlePost(event);
  if (method === 'DELETE') return handleDelete(event);

  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    // Only admins can view cache statistics
    const { user, response: authResponse } = await requirePermission(event, 'settings', 'read');
    if (authResponse) return authResponse;

    try {
      const localStats = cache.getStats();

      // Prefer Postgres-aggregated counters (works across serverless function instances)
      let aggregated = null;
      try {
        await database.connect();
        if (database.pool) {
          const res = await database.pool.query(
            'SELECT hits, misses, sets, deletes, updated_at FROM cache_stats WHERE id = 1'
          );
          if (res.rows && res.rows[0]) {
            const row = res.rows[0];
            const hits = Number(row.hits) || 0;
            const misses = Number(row.misses) || 0;
            const sets = Number(row.sets) || 0;
            const deletes = Number(row.deletes) || 0;
            const hitRate = hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(2) + '%' : '0%';
            aggregated = {
              hits,
              misses,
              sets,
              deletes,
              // Size cannot be meaningfully aggregated for in-memory per-instance caches
              size: null,
              hitRate,
              updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
            };
          }
        }
      } catch (_) {
        // ignore - fall back to local stats
      }

      return ok({
        stats: aggregated || localStats,
        cacheType: aggregated ? 'aggregated-counters' : 'in-memory',
        localStats,
        message: 'Cache statistics retrieved successfully'
      });
    } catch (e) {
      console.error('GET /cache-management error:', e);
      return error(500, 'Failed to retrieve cache statistics');
    }
  }

  async function handlePost(event) {
    // Only admins can reset cache statistics
    const { user, response: authResponse } = await requirePermission(event, 'settings', 'update');
    if (authResponse) return authResponse;

    try {
      const body = parseBody(event);
      const { action } = body;

      if (action === 'reset-stats') {
        cache.resetStats();
        return ok({
          message: 'Cache statistics reset successfully',
          stats: cache.getStats()
        });
      }

      return error(400, 'Invalid action. Supported actions: reset-stats');
    } catch (e) {
      console.error('POST /cache-management error:', e);
      return error(500, 'Failed to perform cache operation');
    }
  }

  async function handleDelete(event) {
    // Only admins can clear cache
    const { user, response: authResponse } = await requirePermission(event, 'settings', 'delete');
    if (authResponse) return authResponse;

    try {
      const body = parseBody(event);
      const { namespace } = body;

      if (namespace) {
        // Clear specific namespace
        const cleared = cache.clearNamespace(namespace);
        return ok({
          message: `Cache namespace '${namespace}' cleared successfully`,
          entriesCleared: cleared,
          stats: cache.getStats()
        });
      } else {
        // Clear all cache
        cache.clearAll();
        return ok({
          message: 'All cache cleared successfully',
          stats: cache.getStats()
        });
      }
    } catch (e) {
      console.error('DELETE /cache-management error:', e);
      return error(500, 'Failed to clear cache');
    }
  }
});
