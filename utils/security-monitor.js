/**
 * Security Monitoring Utility
 * Provides functions for logging security events and checking threats
 * Part of Phase 6: Security Enhancements
 */

const { Pool } = require('../config/database');

/**
 * Security event types
 */
const EVENT_TYPES = {
  SUSPICIOUS_LOGIN: 'suspicious_login',
  BRUTE_FORCE: 'brute_force',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  INVALID_TOKEN: 'invalid_token',
  SESSION_HIJACKING: 'session_hijacking',
  IP_BLACKLISTED: 'ip_blacklisted',
  UNUSUAL_ACTIVITY: 'unusual_activity'
};

/**
 * Security severity levels
 */
const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Log a security event to the database
 * @param {object} eventData - Security event data
 * @param {string} eventData.eventType - Type of security event
 * @param {string} eventData.severity - Severity level
 * @param {number} eventData.userId - User ID (optional)
 * @param {string} eventData.ipAddress - IP address
 * @param {string} eventData.userAgent - User agent string (optional)
 * @param {string} eventData.description - Event description
 * @param {object} eventData.metadata - Additional metadata (optional)
 * @returns {Promise<number>} - Event ID
 */
async function logSecurityEvent({
  eventType,
  severity,
  userId = null,
  ipAddress,
  userAgent = null,
  description,
  metadata = {}
}) {
  const pool = Pool();

  try {
    const result = await pool.query(
      'SELECT log_security_event($1, $2, $3, $4, $5, $6, $7) as event_id',
      [eventType, severity, userId, ipAddress, userAgent, description, JSON.stringify(metadata)]
    );

    return result.rows[0].event_id;
  } catch (error) {
    console.error('Error logging security event:', error);
    throw error;
  }
}

/**
 * Check if an IP address is blacklisted
 * @param {string} ipAddress - IP address to check
 * @returns {Promise<boolean>} - True if blacklisted
 */
async function isIpBlacklisted(ipAddress) {
  const pool = Pool();

  try {
    const result = await pool.query('SELECT is_ip_blacklisted($1) as blacklisted', [ipAddress]);
    return result.rows[0].blacklisted;
  } catch (error) {
    console.error('Error checking IP blacklist:', error);
    // Fail open - don't block if we can't check
    return false;
  }
}

/**
 * Add IP address to blacklist
 * @param {object} blacklistData - Blacklist data
 * @param {string} blacklistData.ipAddress - IP address to blacklist
 * @param {string} blacklistData.reason - Reason for blacklisting
 * @param {number} blacklistData.addedBy - User ID who added the entry
 * @param {Date} blacklistData.expiresAt - Expiration date (optional, null for permanent)
 * @returns {Promise<number>} - Blacklist entry ID
 */
async function addToBlacklist({ ipAddress, reason, addedBy, expiresAt = null }) {
  const pool = Pool();

  try {
    const result = await pool.query(
      `INSERT INTO ip_blacklist (ip_address, reason, added_by, expires_at, is_active, auto_added)
       VALUES ($1, $2, $3, $4, TRUE, FALSE)
       ON CONFLICT (ip_address) DO UPDATE
       SET reason = EXCLUDED.reason, 
           added_by = EXCLUDED.added_by, 
           expires_at = EXCLUDED.expires_at,
           is_active = TRUE,
           added_at = NOW()
       RETURNING id`,
      [ipAddress, reason, addedBy, expiresAt]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('Error adding IP to blacklist:', error);
    throw error;
  }
}

/**
 * Remove IP address from blacklist
 * @param {string} ipAddress - IP address to remove
 * @returns {Promise<boolean>} - True if removed
 */
async function removeFromBlacklist(ipAddress) {
  const pool = Pool();

  try {
    await pool.query('UPDATE ip_blacklist SET is_active = FALSE WHERE ip_address = $1', [
      ipAddress
    ]);
    return true;
  } catch (error) {
    console.error('Error removing IP from blacklist:', error);
    throw error;
  }
}

/**
 * Track API rate limit in database for persistent tracking
 * @param {string} identifier - IP address or user ID
 * @param {string} endpoint - API endpoint
 * @param {number} limit - Rate limit threshold
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<object>} - { allowed: boolean, count: number, resetAt: Date }
 */
async function trackRateLimit(identifier, endpoint, limit, windowMs) {
  const pool = Pool();
  const windowSeconds = Math.floor(windowMs / 1000);

  try {
    // Clean up old entries first
    await pool.query('DELETE FROM api_rate_limits WHERE window_start < NOW() - INTERVAL \'1 hour\'');

    // Get or create rate limit entry for current window
    const result = await pool.query(
      `INSERT INTO api_rate_limits (identifier, endpoint, request_count, window_start, last_request)
       VALUES ($1, $2, 1, date_trunc('minute', NOW()), NOW())
       ON CONFLICT (identifier, endpoint, window_start)
       DO UPDATE SET 
         request_count = api_rate_limits.request_count + 1,
         last_request = NOW()
       RETURNING request_count, window_start`,
      [identifier, endpoint]
    );

    const { request_count, window_start } = result.rows[0];
    const allowed = request_count <= limit;
    const resetAt = new Date(new Date(window_start).getTime() + windowMs);

    return {
      allowed,
      count: request_count,
      remaining: Math.max(0, limit - request_count),
      resetAt
    };
  } catch (error) {
    console.error('Error tracking rate limit:', error);
    // Fail open - allow request if we can't track
    return { allowed: true, count: 0, remaining: limit, resetAt: new Date() };
  }
}

/**
 * Detect suspicious login patterns
 * @param {string} ipAddress - IP address
 * @param {string} email - Email being used for login
 * @returns {Promise<object>} - { suspicious: boolean, reason: string }
 */
async function detectSuspiciousLogin(ipAddress, email) {
  const pool = Pool();

  try {
    // Check for multiple failed login attempts from same IP
    const failedAttempts = await pool.query(
      `SELECT COUNT(*) as count
       FROM login_attempts
       WHERE ip_address = $1
       AND created_at > NOW() - INTERVAL '15 minutes'`,
      [ipAddress]
    );

    const failedCount = parseInt(failedAttempts.rows[0].count);

    if (failedCount >= 5) {
      return {
        suspicious: true,
        reason: `${failedCount} failed login attempts in 15 minutes`
      };
    }

    // Check for login attempts to multiple accounts from same IP
    const multipleAccounts = await pool.query(
      `SELECT COUNT(DISTINCT email) as count
       FROM login_attempts
       WHERE ip_address = $1
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [ipAddress]
    );

    const accountCount = parseInt(multipleAccounts.rows[0].count);

    if (accountCount >= 10) {
      return {
        suspicious: true,
        reason: `Login attempts to ${accountCount} different accounts in 1 hour`
      };
    }

    return { suspicious: false, reason: null };
  } catch (error) {
    console.error('Error detecting suspicious login:', error);
    return { suspicious: false, reason: null };
  }
}

/**
 * Detect SQL injection attempts in query parameters
 * @param {string} input - Input string to check
 * @returns {boolean} - True if SQL injection detected
 */
function detectSqlInjection(input) {
  if (!input || typeof input !== 'string') {return false;}

  // Common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(UNION\s+SELECT)/i,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /(--|#|\/\*|\*\/)/,
    /('(\s|OR|AND))/i,
    /(\bxp_\w+)/i,
    /(\bsp_\w+)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect XSS attempts in input
 * @param {string} input - Input string to check
 * @returns {boolean} - True if XSS detected
 */
function detectXss(input) {
  if (!input || typeof input !== 'string') {return false;}

  // Common XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Get client IP address from event headers
 * @param {object} event - Netlify function event
 * @returns {string} - IP address
 */
function getClientIp(event) {
  return (
    (event.headers &&
      (event.headers['x-forwarded-for']?.split(',')[0].trim() ||
        event.headers['x-real-ip'] ||
        event.headers['client-ip'])) ||
    'unknown'
  );
}

/**
 * Middleware to check IP blacklist before processing request
 * @param {function} handler - Handler function to wrap
 * @returns {function} - Wrapped handler
 */
function withBlacklistCheck(handler) {
  return async (event, context) => {
    const ip = getClientIp(event);

    // Skip check for unknown IPs
    if (ip === 'unknown') {
      return handler(event, context);
    }

    const blacklisted = await isIpBlacklisted(ip);

    if (blacklisted) {
      // Log the blocked attempt
      await logSecurityEvent({
        eventType: EVENT_TYPES.IP_BLACKLISTED,
        severity: SEVERITY.HIGH,
        ipAddress: ip,
        userAgent: event.headers?.['user-agent'],
        description: 'Request from blacklisted IP blocked',
        metadata: {
          path: event.path,
          method: event.httpMethod
        }
      });

      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Access denied',
          message: 'Your IP address has been blocked due to suspicious activity'
        })
      };
    }

    return handler(event, context);
  };
}

module.exports = {
  EVENT_TYPES,
  SEVERITY,
  logSecurityEvent,
  isIpBlacklisted,
  addToBlacklist,
  removeFromBlacklist,
  trackRateLimit,
  detectSuspiciousLogin,
  detectSqlInjection,
  detectXss,
  getClientIp,
  withBlacklistCheck
};
