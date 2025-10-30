// Error tracking and monitoring with Sentry integration
const Sentry = require('@sentry/node');

// Initialize Sentry if DSN is provided
const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const SENTRY_RELEASE = process.env.SENTRY_RELEASE || 'joshburt-website@1.0.0';

let sentryInitialized = false;

/**
 * Initialize Sentry error tracking
 */
function initSentry() {
  if (sentryInitialized) {
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    tracesSampleRate: 0.1, // Sample 10% of transactions
    // Performance monitoring
    integrations: [
      // Add integrations as needed
    ],
    beforeSend(event, _hint) {
      // Filter or modify events before sending
      // Remove sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    }
  });

  sentryInitialized = true;
  console.log('Sentry error tracking initialized');
}

/**
 * Capture an exception with Sentry
 * @param {Error} error - Error object
 * @param {object} context - Additional context
 */
function captureException(error, context = {}) {
  if (!sentryInitialized) {
    initSentry();
  }

  if (!SENTRY_DSN) {
    // Fallback to console logging if Sentry is not configured
    console.error('Error:', error.message, error.stack);
    console.error('Context:', JSON.stringify(context));
    return;
  }

  Sentry.withScope(scope => {
    // Add context to error
    if (context.correlationId) {
      scope.setTag('correlationId', context.correlationId);
    }
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context.functionName) {
      scope.setTag('functionName', context.functionName);
    }

    // Add extra context
    Object.keys(context).forEach(key => {
      if (!['correlationId', 'userId', 'functionName'].includes(key)) {
        scope.setExtra(key, context[key]);
      }
    });

    Sentry.captureException(error);
  });
}

/**
 * Capture a message with Sentry
 * @param {string} message - Message to capture
 * @param {string} level - Severity level (fatal, error, warning, info, debug)
 * @param {object} context - Additional context
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized) {
    initSentry();
  }

  if (!SENTRY_DSN) {
    console.log(`[${level}] ${message}`, context);
    return;
  }

  Sentry.withScope(scope => {
    if (context.correlationId) {
      scope.setTag('correlationId', context.correlationId);
    }

    Object.keys(context).forEach(key => {
      scope.setExtra(key, context[key]);
    });

    Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context for error tracking
 * @param {object} user - User object
 */
function setUser(user) {
  if (!sentryInitialized || !SENTRY_DSN) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name
  });
}

/**
 * Clear user context
 */
function clearUser() {
  if (!sentryInitialized || !SENTRY_DSN) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * @param {object} breadcrumb - Breadcrumb data
 */
function addBreadcrumb(breadcrumb) {
  if (!sentryInitialized || !SENTRY_DSN) {
    return;
  }

  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'custom',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data || {}
  });
}

/**
 * Flush Sentry events (useful before Lambda function ends)
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
async function flush(timeout = 2000) {
  if (!sentryInitialized || !SENTRY_DSN) {
    return true;
  }

  return Sentry.close(timeout);
}

/**
 * Wrapper for Lambda handler with automatic error tracking
 * @param {Function} handler - Original Lambda handler
 * @returns {Function} Wrapped handler
 */
function withErrorTracking(handler) {
  return async (event, context) => {
    try {
      initSentry();
      return await handler(event, context);
    } catch (error) {
      captureException(error, {
        correlationId: event.headers?.['x-correlation-id'],
        functionName: context.functionName,
        path: event.path,
        method: event.httpMethod
      });

      // Re-throw to let the handler deal with it
      throw error;
    } finally {
      // Ensure Sentry events are sent before function ends
      await flush();
    }
  };
}

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  flush,
  withErrorTracking
};
