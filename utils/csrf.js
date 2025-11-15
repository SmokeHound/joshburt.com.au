// CSRF protection utilities for state-changing operations
const nodeCrypto = require('crypto');

// In-memory CSRF token storage (per cold start container)
const csrfTokens = new Map();

/**
 * Token configuration
 */
const TOKEN_EXPIRY = 3600 * 1000; // 1 hour
const TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token
 * @param {string} sessionId - Unique session identifier (user ID, session token, etc.)
 * @returns {string} - CSRF token
 */
function generateCSRFToken(sessionId) {
  const token = nodeCrypto.randomBytes(TOKEN_LENGTH).toString('hex');
  const expiry = Date.now() + TOKEN_EXPIRY;

  csrfTokens.set(token, {
    sessionId,
    expiry
  });

  return token;
}

/**
 * Validate a CSRF token
 * @param {string} token - CSRF token to validate
 * @param {string} sessionId - Expected session identifier
 * @returns {boolean} - True if token is valid
 */
function validateCSRFToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }

  const stored = csrfTokens.get(token);

  if (!stored) {
    return false;
  }

  // Check if token is expired
  if (stored.expiry < Date.now()) {
    csrfTokens.delete(token);
    return false;
  }

  // Check if token matches session
  if (stored.sessionId !== sessionId) {
    return false;
  }

  return true;
}

/**
 * Consume a CSRF token (one-time use)
 * @param {string} token - CSRF token to consume
 * @param {string} sessionId - Expected session identifier
 * @returns {boolean} - True if token was valid and consumed
 */
function consumeCSRFToken(token, sessionId) {
  const isValid = validateCSRFToken(token, sessionId);

  if (isValid) {
    csrfTokens.delete(token);
  }

  return isValid;
}

/**
 * Extract CSRF token from request
 * @param {object} event - Netlify function event
 * @returns {string|null} - CSRF token or null
 */
function extractCSRFToken(event) {
  // Check headers first (X-CSRF-Token)
  const headerToken =
    event.headers && (event.headers['x-csrf-token'] || event.headers['X-CSRF-Token']);

  if (headerToken) {
    return headerToken;
  }

  // Check body for JSON requests
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      if (body.csrfToken) {
        return body.csrfToken;
      }
    } catch (e) {
      // Not JSON, ignore
    }
  }

  // Check query parameters
  if (event.queryStringParameters && event.queryStringParameters.csrfToken) {
    return event.queryStringParameters.csrfToken;
  }

  return null;
}

/**
 * Get session ID from event (from auth token)
 * @param {object} event - Netlify function event
 * @returns {string|null} - Session ID or null
 */
function getSessionId(event) {
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

  const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }

  const token = auth.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId ? `user:${decoded.userId}` : null;
  } catch (e) {
    return null;
  }
}

/**
 * Middleware to require CSRF token for state-changing operations
 * @param {function} handler - The handler function to wrap
 * @param {object} options - Options { methods: ['POST', 'PUT', 'PATCH', 'DELETE'] }
 * @returns {function} - Wrapped handler with CSRF protection
 */
function withCSRFProtection(handler, options = {}) {
  const methods = options.methods || ['POST', 'PUT', 'PATCH', 'DELETE'];

  return async (event, context) => {
    const method = event.httpMethod;

    // Skip CSRF check for safe methods
    if (!methods.includes(method)) {
      return handler(event, context);
    }

    // Get session ID
    const sessionId = getSessionId(event);

    // Skip CSRF check if no session (will be handled by auth check)
    if (!sessionId) {
      return handler(event, context);
    }

    // Extract and validate CSRF token
    const token = extractCSRFToken(event);

    if (!token || !validateCSRFToken(token, sessionId)) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Invalid or missing CSRF token',
          message: 'CSRF token validation failed'
        })
      };
    }

    return handler(event, context);
  };
}

/**
 * Clean up expired CSRF tokens (periodic maintenance)
 */
function cleanupCSRFTokens() {
  const now = Date.now();

  for (const [token, data] of csrfTokens.entries()) {
    if (data.expiry < now) {
      csrfTokens.delete(token);
    }
  }
}

// Auto cleanup every 10 minutes
setInterval(cleanupCSRFTokens, 10 * 60 * 1000);

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  consumeCSRFToken,
  extractCSRFToken,
  getSessionId,
  withCSRFProtection,
  cleanupCSRFTokens
};
