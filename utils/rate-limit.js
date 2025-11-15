// Enhanced rate limiting for API endpoints
// Uses in-memory storage per cold start container for serverless functions

const rateBuckets = {};

/**
 * Rate limit configuration presets
 */
const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute for auth endpoints
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute for API endpoints
  strict: { limit: 5, windowMs: 60 * 1000 }, // 5 requests per minute for sensitive operations
  standard: { limit: 30, windowMs: 60 * 1000 } // 30 requests per minute for standard operations
};

/**
 * Check if a request should be rate limited
 * @param {string} key - Unique identifier for the rate limit bucket (e.g., 'login:127.0.0.1')
 * @param {number} limit - Maximum number of requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} - { allowed: boolean, remaining: number, resetAt: number }
 */
function checkRateLimit(key, limit = 30, windowMs = 60 * 1000) {
  const now = Date.now();

  if (!rateBuckets[key]) {
    rateBuckets[key] = [];
  }

  // Remove expired entries
  rateBuckets[key] = rateBuckets[key].filter(timestamp => now - timestamp < windowMs);

  const allowed = rateBuckets[key].length < limit;

  if (allowed) {
    rateBuckets[key].push(now);
  }

  const remaining = Math.max(0, limit - rateBuckets[key].length);

  // Calculate reset time (when oldest entry expires)
  const resetAt = rateBuckets[key].length > 0 ? rateBuckets[key][0] + windowMs : now + windowMs;

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? 0 : Math.ceil((resetAt - now) / 1000)
  };
}

/**
 * Get client IP address from event
 * @param {object} event - Netlify function event
 * @returns {string} - IP address
 */
function getClientIP(event) {
  return (
    (event.headers &&
      (event.headers['x-forwarded-for']?.split(',')[0].trim() ||
        event.headers['x-real-ip'] ||
        event.headers['client-ip'])) ||
    'unknown'
  );
}

/**
 * Middleware to apply rate limiting to a handler
 * @param {function} handler - The handler function to wrap
 * @param {object} options - Rate limit options { preset: 'auth'|'api'|'strict'|'standard', limit, windowMs }
 * @returns {function} - Wrapped handler with rate limiting
 */
function withRateLimit(handler, options = {}) {
  const preset = options.preset ? RATE_LIMITS[options.preset] : null;
  const limit = options.limit || preset?.limit || 30;
  const windowMs = options.windowMs || preset?.windowMs || 60 * 1000;

  return async (event, context) => {
    const ip = getClientIP(event);
    const path = event.path || event.rawUrl || 'unknown';
    const key = `${path}:${ip}`;

    const result = checkRateLimit(key, limit, windowMs);

    if (!result.allowed) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': result.retryAfter.toString()
        },
        body: JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter
        })
      };
    }

    // Add rate limit headers to successful response
    const response = await handler(event, context);

    if (response && response.headers) {
      response.headers['X-RateLimit-Limit'] = limit.toString();
      response.headers['X-RateLimit-Remaining'] = result.remaining.toString();
      response.headers['X-RateLimit-Reset'] = result.resetAt.toString();
    }

    return response;
  };
}

/**
 * Clean up old rate limit entries (periodic maintenance)
 * Call this periodically to prevent memory leaks in long-running containers
 */
function cleanupRateLimits() {
  const now = Date.now();
  const maxAge = 3600 * 1000; // 1 hour

  for (const key in rateBuckets) {
    if (Object.prototype.hasOwnProperty.call(rateBuckets, key)) {
      rateBuckets[key] = rateBuckets[key].filter(timestamp => now - timestamp < maxAge);
      if (rateBuckets[key].length === 0) {
        delete rateBuckets[key];
      }
    }
  }
}

/**
 * Clear all rate limit buckets (for testing)
 */
function clearRateLimits() {
  for (const key in rateBuckets) {
    if (Object.prototype.hasOwnProperty.call(rateBuckets, key)) {
      delete rateBuckets[key];
    }
  }
}

// Auto cleanup every 10 minutes
setInterval(cleanupRateLimits, 10 * 60 * 1000);

module.exports = {
  checkRateLimit,
  getClientIP,
  withRateLimit,
  cleanupRateLimits,
  clearRateLimits,
  RATE_LIMITS
};
