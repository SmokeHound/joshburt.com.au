// Netlify Function: Cache Management API /.netlify/functions/cache-management
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const cache = require('../../utils/cache');

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
      // Get cache statistics
      const stats = cache.getStats();

      return ok({
        stats,
        cacheType: 'in-memory',
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
