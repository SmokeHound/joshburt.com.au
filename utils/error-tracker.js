/**
 * Error Tracker Utility - Self-hosted error tracking system
 * Replaces external error tracking with database-backed error logging
 */

const cryptoModule = require('crypto');
const { database } = require('../config/database');

/**
 * Generate a unique fingerprint for error grouping
 * Groups similar errors together based on error name, message, and URL
 * @param {Error|Object} error - Error object or error details
 * @param {string} url - URL where error occurred
 * @returns {string} - SHA256 hash fingerprint (64 chars)
 */
function generateFingerprint(error, url = 'unknown') {
  const errorName = error.name || 'Error';
  const errorMessage = error.message || String(error);
  const urlPath = url ? new URL(url, 'http://localhost').pathname : 'unknown';

  // Create signature from error characteristics
  const signature = `${errorName}:${errorMessage}:${urlPath}`;

  // Generate SHA256 hash
  return cryptoModule.createHash('sha256').update(signature).digest('hex').substring(0, 64);
}

/**
 * Extract stack trace from error
 * @param {Error} error - Error object
 * @returns {string|null} - Stack trace string
 */
function extractStackTrace(error) {
  if (error && error.stack) {
    return String(error.stack).substring(0, 10000); // Limit to 10KB
  }
  return null;
}

/**
 * Log error to database with automatic grouping
 * @param {Object} options - Error logging options
 * @param {string} options.level - Error level (error, warning, info, critical)
 * @param {string} options.message - Error message
 * @param {string} [options.stack] - Stack trace
 * @param {number} [options.userId] - User ID (if authenticated)
 * @param {string} [options.url] - URL where error occurred
 * @param {string} [options.userAgent] - User agent string
 * @param {string} [options.ipAddress] - IP address
 * @param {string} [options.environment] - Environment (production, development, etc.)
 * @param {Object} [options.metadata] - Additional context data
 * @returns {Promise<Object>} - Created/updated error log
 */
async function logError({
  level = 'error',
  message,
  stack = null,
  userId = null,
  url = null,
  userAgent = null,
  ipAddress = null,
  environment = null,
  metadata = {}
}) {
  try {
    // Validate required fields
    if (!message) {
      console.error('Error tracker: message is required');
      return null;
    }

    // Generate fingerprint for grouping
    const fingerprint = generateFingerprint({ message }, url || 'unknown');

    // Set environment
    const env = environment || process.env.NODE_ENV || 'production';

    // Check if error already exists
    const existing = await database.get(
      'SELECT id, occurrences FROM error_logs WHERE fingerprint = ?',
      [fingerprint]
    );

    if (existing) {
      // Update existing error - increment occurrences and update last_seen
      await database.run(
        `UPDATE error_logs 
         SET occurrences = occurrences + 1, 
             last_seen = NOW() 
         WHERE fingerprint = ?`,
        [fingerprint]
      );

      return {
        id: existing.id,
        fingerprint,
        occurrences: existing.occurrences + 1,
        updated: true
      };
    } else {
      // Insert new error
      const result = await database.run(
        `INSERT INTO error_logs 
         (level, message, stack_trace, user_id, url, user_agent, ip_address, environment, metadata, fingerprint)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          level,
          message.substring(0, 5000), // Limit message length
          stack,
          userId,
          url,
          userAgent,
          ipAddress,
          env,
          JSON.stringify(metadata),
          fingerprint
        ]
      );

      return {
        id: result.id,
        fingerprint,
        occurrences: 1,
        created: true
      };
    }
  } catch (err) {
    // Fail silently to avoid infinite error loops
    console.error('Failed to log error to database:', err);
    return null;
  }
}

/**
 * Log error from Express/Netlify function error handler
 * Convenience wrapper for common server-side error logging
 * @param {Error} error - Error object
 * @param {Object} event - Netlify event object
 * @param {string} [level='error'] - Error level
 * @returns {Promise<Object>} - Logged error result
 */
async function logServerError(error, event, level = 'error') {
  const url = event.path || event.rawUrl || 'unknown';
  const userAgent = event.headers && (event.headers['user-agent'] || event.headers['User-Agent']);
  const ipAddress =
    event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip']);

  // Try to extract user from event context
  let userId = null;
  if (event.requestContext && event.requestContext.user) {
    userId = event.requestContext.user.id;
  }

  return await logError({
    level,
    message: error.message || String(error),
    stack: extractStackTrace(error),
    userId,
    url,
    userAgent,
    ipAddress,
    environment: process.env.NODE_ENV || 'production',
    metadata: {
      method: event.httpMethod,
      query: event.queryStringParameters,
      errorName: error.name,
      errorCode: error.code
    }
  });
}

/**
 * Get error logs with filtering and pagination
 * @param {Object} options - Query options
 * @param {boolean} [options.resolved] - Filter by resolved status
 * @param {string} [options.level] - Filter by level
 * @param {string} [options.environment] - Filter by environment
 * @param {number} [options.limit=50] - Number of results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<Array>} - Array of error logs
 */
async function getErrorLogs({
  resolved = null,
  level = null,
  environment = null,
  limit = 50,
  offset = 0
} = {}) {
  try {
    let sql = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];

    if (resolved !== null) {
      sql += ' AND resolved = ?';
      params.push(resolved);
    }

    if (level) {
      sql += ' AND level = ?';
      params.push(level);
    }

    if (environment) {
      sql += ' AND environment = ?';
      params.push(environment);
    }

    sql += ' ORDER BY last_seen DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const errors = await database.all(sql, params);
    return errors;
  } catch (err) {
    console.error('Failed to fetch error logs:', err);
    return [];
  }
}

/**
 * Get error statistics
 * @returns {Promise<Object>} - Error statistics
 */
async function getErrorStats() {
  try {
    const stats = await database.get(`
      SELECT 
        COUNT(*) as total_errors,
        COUNT(DISTINCT fingerprint) as unique_errors,
        SUM(occurrences) as total_occurrences,
        COUNT(CASE WHEN resolved = FALSE THEN 1 END) as unresolved_count,
        COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
        COUNT(CASE WHEN level = 'warning' THEN 1 END) as warning_count
      FROM error_logs
    `);

    return stats || {};
  } catch (err) {
    console.error('Failed to fetch error stats:', err);
    return {};
  }
}

/**
 * Resolve an error
 * @param {number} errorId - Error ID
 * @param {number} resolvedBy - User ID who resolved it
 * @returns {Promise<boolean>} - Success status
 */
async function resolveError(errorId, resolvedBy) {
  try {
    await database.run(
      'UPDATE error_logs SET resolved = TRUE, resolved_by = ?, resolved_at = NOW() WHERE id = ?',
      [resolvedBy, errorId]
    );
    return true;
  } catch (err) {
    console.error('Failed to resolve error:', err);
    return false;
  }
}

/**
 * Delete old resolved errors (cleanup)
 * @param {number} daysOld - Delete errors older than this many days
 * @returns {Promise<number>} - Number of deleted errors
 */
async function cleanupOldErrors(daysOld = 90) {
  try {
    const result = await database.run(
      `DELETE FROM error_logs 
       WHERE resolved = TRUE 
       AND resolved_at < NOW() - INTERVAL '? days'`,
      [daysOld]
    );
    return result.changes || 0;
  } catch (err) {
    console.error('Failed to cleanup old errors:', err);
    return 0;
  }
}

module.exports = {
  logError,
  logServerError,
  generateFingerprint,
  extractStackTrace,
  getErrorLogs,
  getErrorStats,
  resolveError,
  cleanupOldErrors
};
