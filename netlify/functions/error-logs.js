/**
 * Error Logs API - Self-hosted error tracking
 * Replaces external error tracking with database-backed error logging
 *
 * Endpoints:
 * - GET    /error-logs - Get error logs (admin only)
 * - POST   /error-logs - Log error (public, for client-side errors)
 * - PUT    /error-logs/:id - Resolve error (admin only)
 * - DELETE /error-logs/:id - Delete error (admin only)
 */

const { withHandler, ok, badRequest, error } = require('../../utils/fn');
const { requirePermission, parseBody } = require('../../utils/http');
const {
  logError,
  getErrorLogs,
  getErrorStats,
  resolveError
} = require('../../utils/error-tracker');
const { database } = require('../../config/database');
const { logAudit } = require('../../utils/audit');

exports.handler = withHandler(async event => {
  const method = event.httpMethod;

  // POST - Log error (public endpoint for client-side error reporting)
  if (method === 'POST') {
    const body = parseBody(event);
    const { level = 'error', message, stack, url, metadata = {} } = body;

    // Validate required fields
    if (!message) {
      return badRequest('Error message is required');
    }

    // Extract request metadata
    const userAgent = event.headers['user-agent'] || event.headers['User-Agent'];
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['client-ip'];

    // Try to get user ID if authenticated (optional)
    let userId = null;
    if (event.requestContext && event.requestContext.user) {
      userId = event.requestContext.user.id;
    }

    // Log the error
    const result = await logError({
      level,
      message,
      stack,
      userId,
      url,
      userAgent,
      ipAddress,
      environment: process.env.NODE_ENV || 'production',
      metadata: {
        ...metadata,
        source: 'client',
        userAgent,
        screenResolution: metadata.screenResolution,
        viewport: metadata.viewport,
        timestamp: new Date().toISOString()
      }
    });

    if (!result) {
      return error(500, 'Failed to log error');
    }

    return ok({ success: true, errorId: result.id }, 201);
  }

  // GET - Get error logs with filtering (admin only)
  if (method === 'GET') {
    const { user, response: authResponse } = await requirePermission(event, 'error-logs', 'read');
    if (authResponse) return authResponse;

    const qs = event.queryStringParameters || {};
    const { resolved, level, environment, limit = 50, offset = 0, stats = 'false' } = qs;

    // If stats requested, return statistics
    if (stats === 'true') {
      const statistics = await getErrorStats();
      return ok(statistics);
    }

    // Parse resolved filter
    let resolvedFilter = null;
    if (resolved === 'true') resolvedFilter = true;
    if (resolved === 'false') resolvedFilter = false;

    // Get error logs
    const errors = await getErrorLogs({
      resolved: resolvedFilter,
      level,
      environment,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Log audit trail
    await logAudit({
      userId: user.id,
      action: 'error_logs_view',
      details: `Viewed error logs (filters: resolved=${resolved}, level=${level})`,
      ipAddress: event.headers['x-forwarded-for'],
      userAgent: event.headers['user-agent']
    });

    return ok({
      errors,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: errors.length === parseInt(limit)
      }
    });
  }

  // PUT - Resolve/unresolve error (admin only)
  if (method === 'PUT') {
    const { user, response: authResponse } = await requirePermission(event, 'error-logs', 'update');
    if (authResponse) return authResponse;

    const body = parseBody(event);
    const { id, resolved } = body;

    if (!id) {
      return badRequest('Error ID is required');
    }

    if (typeof resolved !== 'boolean') {
      return badRequest('Resolved status must be a boolean');
    }

    // Update error resolution status
    if (resolved) {
      await resolveError(id, user.id);
    } else {
      // Unresolve error
      await database.run(
        'UPDATE error_logs SET resolved = FALSE, resolved_by = NULL, resolved_at = NULL WHERE id = ?',
        [id]
      );
    }

    // Log audit trail
    await logAudit({
      userId: user.id,
      action: 'error_log_update',
      details: `${resolved ? 'Resolved' : 'Unresolved'} error #${id}`,
      ipAddress: event.headers['x-forwarded-for'],
      userAgent: event.headers['user-agent']
    });

    return ok({ success: true, id, resolved });
  }

  // DELETE - Delete error (admin only)
  if (method === 'DELETE') {
    const { user, response: authResponse } = await requirePermission(event, 'error-logs', 'delete');
    if (authResponse) return authResponse;

    const qs = event.queryStringParameters || {};
    const { id } = qs;

    if (!id) {
      return badRequest('Error ID is required');
    }

    // Delete error
    await database.run('DELETE FROM error_logs WHERE id = ?', [parseInt(id)]);

    // Log audit trail
    await logAudit({
      userId: user.id,
      action: 'error_log_delete',
      details: `Deleted error #${id}`,
      ipAddress: event.headers['x-forwarded-for'],
      userAgent: event.headers['user-agent']
    });

    return ok({ success: true, id });
  }

  return error(405, 'Method not allowed');
});
