/**
 * API Key Authentication Middleware
 * Provides API key-based authentication for programmatic access
 * Part of Phase 6: Security Enhancements
 */

const crypto = require('crypto');
const { Pool } = require('../config/database');
const { logSecurityEvent, EVENT_TYPES, SEVERITY, getClientIp } = require('./security-monitor');

/**
 * Generate a new API key
 * Format: sk_live_<random_32_chars> or sk_test_<random_32_chars>
 * @param {string} environment - 'live' or 'test'
 * @returns {string} - Generated API key
 */
function generateApiKey(environment = 'live') {
  const prefix = `sk_${environment}_`;
  const randomBytes = crypto.randomBytes(24).toString('hex'); // 48 hex chars
  return prefix + randomBytes;
}

/**
 * Hash an API key for secure storage
 * @param {string} apiKey - The API key to hash
 * @returns {string} - SHA-256 hash of the API key
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Extract key prefix for identification (first 8 chars after prefix)
 * @param {string} apiKey - The API key
 * @returns {string} - Key prefix (e.g., "sk_live_12345678")
 */
function getKeyPrefix(apiKey) {
  // Return first 16 characters (includes sk_live_ or sk_test_ + 8 random chars)
  return apiKey.substring(0, 16);
}

/**
 * Validate API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} - True if valid format
 */
function isValidApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;

  // Must start with sk_live_ or sk_test_
  if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
    return false;
  }

  // Must be at least 56 characters (prefix + 48 hex chars)
  if (apiKey.length < 56) {
    return false;
  }

  return true;
}

/**
 * Authenticate request using API key
 * @param {string} apiKey - The API key from request
 * @param {string} requiredPermission - Required permission (e.g., 'products:read')
 * @returns {Promise<object>} - { valid: boolean, userId: number, keyId: number, error: string }
 */
async function authenticateApiKey(apiKey, requiredPermission = null) {
  const pool = Pool();

  try {
    // Validate format first
    if (!isValidApiKeyFormat(apiKey)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const keyHash = hashApiKey(apiKey);

    // Get API key from database
    const result = await pool.query(
      `SELECT id, user_id, name, permissions, rate_limit, is_active, expires_at, metadata
       FROM api_keys
       WHERE key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid API key' };
    }

    const keyData = result.rows[0];

    // Check if key is active
    if (!keyData.is_active) {
      return { valid: false, error: 'API key is inactive' };
    }

    // Check if key is expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Check permission if required
    if (requiredPermission) {
      const hasPermission = await pool.query(
        'SELECT has_api_permission($1, $2) as has_permission',
        [keyHash, requiredPermission]
      );

      if (!hasPermission.rows[0].has_permission) {
        return {
          valid: false,
          error: `API key does not have permission: ${requiredPermission}`
        };
      }
    }

    return {
      valid: true,
      userId: keyData.user_id,
      keyId: keyData.id,
      keyName: keyData.name,
      permissions: keyData.permissions,
      rateLimit: keyData.rate_limit,
      metadata: keyData.metadata
    };
  } catch (error) {
    console.error('Error authenticating API key:', error);
    return { valid: false, error: 'Authentication error' };
  }
}

/**
 * Extract API key from request headers
 * Supports multiple header formats:
 * - Authorization: Bearer sk_live_...
 * - X-API-Key: sk_live_...
 * @param {object} event - Netlify function event
 * @returns {string|null} - API key or null
 */
function extractApiKey(event) {
  const headers = event.headers || {};

  // Try Authorization header first (Bearer token)
  const authHeader = headers.authorization || headers.Authorization;
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }
  }

  // Try X-API-Key header
  const apiKeyHeader = headers['x-api-key'] || headers['X-API-Key'];
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Try query parameter (less secure, but useful for webhooks)
  const queryParams = event.queryStringParameters || {};
  if (queryParams.api_key) {
    return queryParams.api_key;
  }

  return null;
}

/**
 * Log API key usage
 * @param {object} options - Usage data
 */
async function logApiKeyUsage({
  apiKey,
  endpoint,
  method,
  ipAddress,
  userAgent,
  responseStatus,
  responseTimeMs
}) {
  const pool = Pool();

  try {
    const keyHash = hashApiKey(apiKey);

    await pool.query('SELECT log_api_key_usage($1, $2, $3, $4, $5, $6, $7)', [
      keyHash,
      endpoint,
      method,
      ipAddress,
      userAgent,
      responseStatus,
      responseTimeMs
    ]);
  } catch (error) {
    console.error('Error logging API key usage:', error);
    // Don't throw - logging failures shouldn't break the request
  }
}

/**
 * Middleware to require API key authentication
 * @param {function} handler - Handler function to wrap
 * @param {string} requiredPermission - Required permission (optional)
 * @returns {function} - Wrapped handler
 */
function withApiKeyAuth(handler, requiredPermission = null) {
  return async (event, context) => {
    const startTime = Date.now();
    const ip = getClientIp(event);
    const userAgent = event.headers?.['user-agent'];

    // Extract API key
    const apiKey = extractApiKey(event);

    if (!apiKey) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing API key',
          message: 'Provide API key via Authorization header (Bearer token) or X-API-Key header'
        })
      };
    }

    // Authenticate API key
    const authResult = await authenticateApiKey(apiKey, requiredPermission);

    if (!authResult.valid) {
      // Log failed authentication attempt
      await logSecurityEvent({
        eventType: EVENT_TYPES.INVALID_TOKEN,
        severity: SEVERITY.MEDIUM,
        userId: null,
        ipAddress: ip,
        userAgent,
        description: `Failed API key authentication: ${authResult.error}`,
        metadata: {
          endpoint: event.path,
          method: event.httpMethod,
          required_permission: requiredPermission
        }
      });

      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalid API key',
          message: authResult.error
        })
      };
    }

    // Add API key info to event for handler to use
    event.apiKey = {
      id: authResult.keyId,
      userId: authResult.userId,
      name: authResult.keyName,
      permissions: authResult.permissions,
      rateLimit: authResult.rateLimit,
      metadata: authResult.metadata
    };

    // Also set user info for compatibility with existing handlers
    event.user = {
      id: authResult.userId
    };

    try {
      // Execute handler
      const response = await handler(event, context);

      // Log successful usage
      const responseTime = Date.now() - startTime;
      await logApiKeyUsage({
        apiKey,
        endpoint: event.path,
        method: event.httpMethod,
        ipAddress: ip,
        userAgent,
        responseStatus: response.statusCode || 200,
        responseTimeMs: responseTime
      });

      return response;
    } catch (error) {
      // Log error usage
      const responseTime = Date.now() - startTime;
      await logApiKeyUsage({
        apiKey,
        endpoint: event.path,
        method: event.httpMethod,
        ipAddress: ip,
        userAgent,
        responseStatus: 500,
        responseTimeMs: responseTime
      });

      throw error;
    }
  };
}

/**
 * Check API key rate limit
 * @param {string} apiKey - The API key
 * @param {number} limit - Rate limit (requests per minute)
 * @returns {Promise<object>} - { allowed: boolean, remaining: number, resetAt: Date }
 */
async function checkApiKeyRateLimit(apiKey, limit) {
  const pool = Pool();
  const keyHash = hashApiKey(apiKey);

  try {
    // Count requests in the last minute
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM api_key_usage u
       JOIN api_keys k ON u.api_key_id = k.id
       WHERE k.key_hash = $1
       AND u.timestamp > NOW() - INTERVAL '1 minute'`,
      [keyHash]
    );

    const count = parseInt(result.rows[0].count);
    const allowed = count < limit;
    const remaining = Math.max(0, limit - count);
    const resetAt = new Date(Date.now() + 60000); // Reset in 1 minute

    return { allowed, remaining, resetAt, current: count };
  } catch (error) {
    console.error('Error checking API key rate limit:', error);
    // Fail open
    return { allowed: true, remaining: limit, resetAt: new Date(), current: 0 };
  }
}

module.exports = {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  isValidApiKeyFormat,
  authenticateApiKey,
  extractApiKey,
  logApiKeyUsage,
  withApiKeyAuth,
  checkApiKeyRateLimit
};
