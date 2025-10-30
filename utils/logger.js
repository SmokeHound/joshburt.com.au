// Structured logging utility with correlation ID support
// Provides consistent logging across all serverless functions

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Generate a correlation ID for request tracing
 * @returns {string} Correlation ID (UUID v4 format)
 */
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract correlation ID from event headers or generate new one
 * @param {object} event - Lambda event object
 * @returns {string} Correlation ID
 */
function getCorrelationId(event) {
  const headers = event.headers || {};
  return headers['x-correlation-id'] || headers['X-Correlation-ID'] || generateCorrelationId();
}

/**
 * Create a structured log entry
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Log message
 * @param {object} meta - Additional metadata
 * @returns {object} Structured log object
 */
function createLogEntry(level, message, meta = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
}

/**
 * Logger class with correlation ID support
 */
class Logger {
  constructor(correlationId = null, context = {}) {
    this.correlationId = correlationId || generateCorrelationId();
    this.context = context;
  }

  /**
   * Log at specified level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  log(level, message, meta = {}) {
    const entry = createLogEntry(level, message, {
      correlationId: this.correlationId,
      ...this.context,
      ...meta
    });

    // In production, this would be sent to a log aggregation service
    // For now, output to console with structured format
    console.log(JSON.stringify(entry));
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    // Only log debug messages if DEBUG environment variable is set
    if (process.env.DEBUG) {
      this.log(LOG_LEVELS.DEBUG, message, meta);
    }
  }

  /**
   * Create a child logger with additional context
   * @param {object} additionalContext - Additional context to merge
   * @returns {Logger} New logger instance
   */
  child(additionalContext = {}) {
    return new Logger(this.correlationId, {
      ...this.context,
      ...additionalContext
    });
  }

  /**
   * Log function execution timing
   * @param {string} functionName - Name of the function
   * @param {number} startTime - Start time in milliseconds
   * @param {object} meta - Additional metadata
   */
  logTiming(functionName, startTime, meta = {}) {
    const duration = Date.now() - startTime;
    this.info(`Function execution: ${functionName}`, {
      functionName,
      durationMs: duration,
      ...meta
    });
  }

  /**
   * Log HTTP request
   * @param {object} event - Lambda event object
   */
  logRequest(event) {
    this.info('HTTP Request', {
      method: event.httpMethod,
      path: event.path,
      query: event.queryStringParameters,
      headers: this.sanitizeHeaders(event.headers),
      ip: event.headers?.['x-forwarded-for'] || 'unknown'
    });
  }

  /**
   * Log HTTP response
   * @param {number} statusCode - HTTP status code
   * @param {object} meta - Additional metadata
   */
  logResponse(statusCode, meta = {}) {
    this.info('HTTP Response', {
      statusCode,
      ...meta
    });
  }

  /**
   * Sanitize headers to remove sensitive information
   * @param {object} headers - Request headers
   * @returns {object} Sanitized headers
   */
  sanitizeHeaders(headers = {}) {
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'cookie', 'x-api-key'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * Create a logger from Lambda event
 * @param {object} event - Lambda event object
 * @param {object} context - Lambda context object
 * @returns {Logger} Logger instance
 */
function createLogger(event, context = {}) {
  const correlationId = getCorrelationId(event);

  // Add correlation ID to response headers
  const baseContext = {
    requestId: context.requestId || 'unknown',
    functionName: context.functionName || 'unknown'
  };

  return new Logger(correlationId, baseContext);
}

module.exports = {
  Logger,
  createLogger,
  generateCorrelationId,
  getCorrelationId,
  LOG_LEVELS
};
