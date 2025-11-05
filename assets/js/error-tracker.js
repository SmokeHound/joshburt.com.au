/**
 * Global error handler and monitoring utilities
 * Provides basic error tracking and logging for production
 */

(function() {
  'use strict';

  // Error tracking configuration
  const ErrorTracker = {
    // Store recent errors (limit to prevent memory issues)
    recentErrors: [],
    maxErrors: 50,

    // Track if error dialog is already showing
    errorDialogShowing: false,

    /**
     * Initialize error tracking
     */
    init: function() {
      // Global error handler
      window.addEventListener('error', (event) => {
        this.logError({
          type: 'JavaScript Error',
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString()
        });
      });

      // Promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          type: 'Unhandled Promise Rejection',
          message: event.reason?.message || event.reason,
          stack: event.reason?.stack,
          timestamp: new Date().toISOString()
        });
      });

      // Network error tracking
      this.trackNetworkErrors();

      console.log('🛡️ Error tracking initialized');
    },

    /**
     * Log an error
     */
    logError: function(error) {
      // Add to recent errors
      this.recentErrors.push(error);
      if (this.recentErrors.length > this.maxErrors) {
        this.recentErrors.shift();
      }

      // Log to console in development
      if (this.isDevelopment()) {
        console.error('Error tracked:', error);
      }

      // Store in localStorage for debugging
      try {
        const stored = JSON.parse(localStorage.getItem('errorLog') || '[]');
        stored.push(error);
        // Keep only last 100 errors
        if (stored.length > 100) {stored.splice(0, stored.length - 100);}
        localStorage.setItem('errorLog', JSON.stringify(stored));
      } catch (e) {
        // Ignore storage errors
      }

      // Show user-friendly error notification for critical errors
      if (this.isCriticalError(error)) {
        this.showErrorNotification(error);
      }
    },

    /**
     * Track network errors
     */
    trackNetworkErrors: function() {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);
          if (!response.ok && response.status >= 500) {
            this.logError({
              type: 'Network Error',
              message: `HTTP ${response.status} - ${response.statusText}`,
              url: args[0],
              timestamp: new Date().toISOString()
            });
          }
          return response;
        } catch (_error) {
          this.logError({
            type: 'Network Error',
            message: _error.message,
            url: args[0],
            timestamp: new Date().toISOString()
          });
          throw _error;
        }
      };
    },

    /**
     * Check if error is critical
     */
    isCriticalError: function(error) {
      const criticalKeywords = ['auth', 'database', 'fatal', 'critical'];
      const errorText = (error.message || '').toLowerCase();
      return criticalKeywords.some(keyword => errorText.includes(keyword));
    },

    /**
     * Show error notification to user
     */
    showErrorNotification: function(_error) {
      if (this.errorDialogShowing) {return;}
      this.errorDialogShowing = true;

      // Use existing toast if available
      if (typeof window.showToast === 'function') {
        window.showToast('An error occurred. Please refresh the page.', 'error');
        setTimeout(() => { this.errorDialogShowing = false; }, 5000);
        return;
      }

      // Fallback: create simple notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
      `;
      notification.innerHTML = `
        <strong>⚠️ Error Occurred</strong>
        <p style="margin: 8px 0 0; font-size: 14px;">
          Something went wrong. Please refresh the page or contact support if the issue persists.
        </p>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          notification.remove();
          this.errorDialogShowing = false;
        }, 300);
      }, 5000);
    },

    /**
     * Check if in development mode
     */
    isDevelopment: function() {
      return window.location.hostname === 'localhost' ||
             window.location.hostname === '127.0.0.1' ||
             window.location.port === '8000' ||
             window.location.port === '8888';
    },

    /**
     * Get error log for debugging
     */
    getErrorLog: function() {
      try {
        return JSON.parse(localStorage.getItem('errorLog') || '[]');
      } catch {
        return [];
      }
    },

    /**
     * Clear error log
     */
    clearErrorLog: function() {
      this.recentErrors = [];
      try {
        localStorage.removeItem('errorLog');
      } catch (e) {
        // Ignore
      }
      console.log('Error log cleared');
    },

    /**
     * Export error log as JSON
     */
    exportErrorLog: function() {
      const errors = this.getErrorLog();
      const blob = new Blob([JSON.stringify(errors, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ErrorTracker.init());
  } else {
    ErrorTracker.init();
  }

  // Expose API
  window.ErrorTracker = ErrorTracker;

  // Add CSS animation for notifications
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
})();
