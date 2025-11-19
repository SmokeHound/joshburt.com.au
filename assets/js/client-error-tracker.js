/**
 * Client-Side Error Tracker
 * Captures and reports JavaScript errors to self-hosted error tracking system
 */

(function () {
  'use strict';

  const FN_BASE = window.FN_BASE || '/.netlify/functions';
  const ERROR_LOG_ENDPOINT = `${FN_BASE}/error-logs`;

  // Configuration
  const config = {
    enabled: true,
    maxErrorsPerSession: 50,
    sampleRate: 1.0, // Report 100% of errors (can be reduced to 0.0-1.0)
    ignoreErrors: [
      'ResizeObserver loop limit exceeded', // Common harmless error
      'Non-Error promise rejection captured' // Often not actionable
    ],
    environment: window.location.hostname.includes('localhost') ? 'development' : 'production'
  };

  // Session error counter
  let errorCount = 0;

  /**
   * Check if error should be reported
   */
  function shouldReportError(message) {
    // Check if tracking is enabled
    if (!config.enabled) {return false;}

    // Check session limit
    if (errorCount >= config.maxErrorsPerSession) {return false;}

    // Check sample rate
    if (Math.random() > config.sampleRate) {return false;}

    // Check ignore list
    if (config.ignoreErrors.some(ignore => message.includes(ignore))) {return false;}

    return true;
  }

  /**
   * Get screen and viewport info
   */
  function getScreenInfo() {
    return {
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  /**
   * Get browser info
   */
  function getBrowserInfo() {
    const ua = navigator.userAgent;
    return {
      userAgent: ua,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  /**
   * Report error to backend
   */
  async function reportError({ level = 'error', message, stack, url, metadata = {} }) {
    if (!shouldReportError(message)) {return;}

    errorCount++;

    try {
      const payload = {
        level,
        message,
        stack,
        url: url || window.location.href,
        metadata: {
          ...metadata,
          ...getScreenInfo(),
          ...getBrowserInfo(),
          timestamp: new Date().toISOString(),
          pageLoadTime: performance.now(),
          referrer: document.referrer
        }
      };

      // Use sendBeacon if available (doesn't block page unload)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(ERROR_LOG_ENDPOINT, blob);
      } else {
        // Fallback to fetch
        fetch(ERROR_LOG_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true // Keep request alive even if page is closing
        }).catch(err => {
          console.warn('Failed to report error:', err);
        });
      }
    } catch (err) {
      // Silently fail to avoid infinite error loops
      console.warn('Error tracker failed:', err);
    }
  }

  /**
   * Handle uncaught JavaScript errors
   */
  window.addEventListener('error', function (event) {
    const message = event.message || 'Unknown error';
    const stack = event.error ? event.error.stack : null;
    const url = event.filename || window.location.href;

    reportError({
      level: 'error',
      message: `${message} at ${url}:${event.lineno}:${event.colno}`,
      stack,
      url,
      metadata: {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });

  /**
   * Handle unhandled promise rejections
   */
  window.addEventListener('unhandledrejection', function (event) {
    const message = event.reason ? String(event.reason) : 'Unhandled promise rejection';
    const stack = event.reason && event.reason.stack ? event.reason.stack : null;

    reportError({
      level: 'error',
      message,
      stack,
      url: window.location.href,
      metadata: {
        type: 'unhandled_rejection',
        reason: event.reason
      }
    });
  });

  /**
   * Manual error reporting API
   * Usage: window.ErrorTracker.logError('Something went wrong', { context: 'checkout' })
   */
  window.ErrorTracker = {
    /**
     * Log an error
     */
    logError: function (message, metadata = {}) {
      reportError({
        level: 'error',
        message,
        stack: new Error(message).stack,
        url: window.location.href,
        metadata: {
          ...metadata,
          type: 'manual'
        }
      });
    },

    /**
     * Log a warning
     */
    logWarning: function (message, metadata = {}) {
      reportError({
        level: 'warning',
        message,
        stack: new Error(message).stack,
        url: window.location.href,
        metadata: {
          ...metadata,
          type: 'manual'
        }
      });
    },

    /**
     * Log an info message
     */
    logInfo: function (message, metadata = {}) {
      reportError({
        level: 'info',
        message,
        url: window.location.href,
        metadata: {
          ...metadata,
          type: 'manual'
        }
      });
    },

    /**
     * Configure error tracker
     */
    configure: function (options) {
      Object.assign(config, options);
    },

    /**
     * Get current config
     */
    getConfig: function () {
      return { ...config };
    },

    /**
     * Get error count for this session
     */
    getErrorCount: function () {
      return errorCount;
    }
  };

  console.log('✅ Error Tracker initialized');
})();
