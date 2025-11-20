// Netlify Function: Database Performance Metrics API /.netlify/functions/database-performance
const { withHandler, ok, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const queryMonitor = require('../../utils/query-monitor');

exports.handler = withHandler(async function (event) {
  const method = event.httpMethod;
  
  if (method === 'GET') return handleGet(event);
  if (method === 'DELETE') return handleDelete(event);
  
  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    // Only admins can view database performance metrics
    const { user, response: authResponse } = await requirePermission(event, 'settings', 'read');
    if (authResponse) return authResponse;

    try {
      const params = event.queryStringParameters || {};
      const { view = 'summary', metric = 'totalDuration', limit = '10' } = params;

      let data = {};

      switch (view) {
        case 'summary':
          data = queryMonitor.getSummary();
          break;
          
        case 'all':
          data = {
            summary: queryMonitor.getSummary(),
            metrics: queryMonitor.getMetrics()
          };
          break;
          
        case 'slow':
          data = {
            slowQueries: queryMonitor.getSlowQueries(parseInt(limit)),
            threshold: queryMonitor.slowQueryThreshold
          };
          break;
          
        case 'top':
          data = {
            topQueries: queryMonitor.getTopQueries(metric, parseInt(limit)),
            metric
          };
          break;
          
        default:
          return error(400, 'Invalid view. Valid options: summary, all, slow, top');
      }

      return ok(data);
    } catch (e) {
      console.error('GET /database-performance error:', e);
      return error(500, 'Failed to retrieve database performance metrics');
    }
  }

  async function handleDelete(event) {
    // Only admins can reset metrics
    const { user, response: authResponse } = await requirePermission(event, 'settings', 'delete');
    if (authResponse) return authResponse;

    try {
      queryMonitor.reset();
      return ok({
        message: 'Database performance metrics reset successfully',
        summary: queryMonitor.getSummary()
      });
    } catch (e) {
      console.error('DELETE /database-performance error:', e);
      return error(500, 'Failed to reset database performance metrics');
    }
  }
});
