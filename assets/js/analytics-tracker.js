/**
 * Client-side Analytics Tracker
 * Automatically tracks page views, clicks, and custom events
 * Integrates with the analytics-events API endpoint
 */

(function () {
  'use strict';

  const FN_BASE = window.FN_BASE || '/.netlify/functions';
  const SESSION_STORAGE_KEY = 'analytics_session_id';
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  class AnalyticsTracker {
    constructor() {
      this.sessionId = this.getOrCreateSession();
      this.eventQueue = [];
      this.isTracking = this.checkTrackingConsent();
      this.lastActivityTime = Date.now();

      if (this.isTracking) {
        this.init();
      }
    }

    /**
     * Initialize tracker and set up automatic tracking
     */
    init() {
      // Track page view on load
      this.trackPageView();

      // Track page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.updateActivity();
        }
      });

      // Track clicks on links and buttons
      document.addEventListener('click', (e) => {
        const target = e.target.closest('a, button');
        if (target) {
          this.trackClick(target);
        }
      });

      // Periodic activity check to extend session
      setInterval(() => this.checkActivity(), 60000); // Every minute
    }

    /**
     * Get or create a session ID
     */
    getOrCreateSession() {
      try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const { sessionId, timestamp } = JSON.parse(stored);

          // Check if session is still valid (within timeout)
          if (Date.now() - timestamp < SESSION_TIMEOUT) {
            return sessionId;
          }
        }
      } catch (e) {
        console.warn('Failed to retrieve session from storage:', e);
      }

      // Create new session
      const newSessionId = this.generateSessionId();
      this.saveSession(newSessionId);
      return newSessionId;
    }

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
      return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Save session to storage
     */
    saveSession(sessionId) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          sessionId,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to save session to storage:', e);
      }
    }

    /**
     * Check if user has consented to tracking
     */
    checkTrackingConsent() {
      // Check for Do Not Track browser setting
      if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
        return false;
      }

      // Check for stored consent preference
      try {
        const consent = localStorage.getItem('analytics_consent');
        if (consent === 'false') {
          return false;
        }
      } catch (e) {
        // If can't access localStorage, default to tracking
      }

      return true;
    }

    /**
     * Update last activity time
     */
    updateActivity() {
      this.lastActivityTime = Date.now();
      this.saveSession(this.sessionId);
    }

    /**
     * Check activity and create new session if timeout exceeded
     */
    checkActivity() {
      if (Date.now() - this.lastActivityTime > SESSION_TIMEOUT) {
        this.sessionId = this.getOrCreateSession();
      }
    }

    /**
     * Track a page view
     */
    trackPageView() {
      this.trackEvent('page_view', {
        title: document.title,
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      });
    }

    /**
     * Track a click event
     */
    trackClick(element) {
      const properties = {
        tag: element.tagName.toLowerCase(),
        text: element.textContent?.trim().substring(0, 100),
        href: element.getAttribute('href'),
        id: element.id,
        class: element.className
      };

      this.trackEvent('click', properties);
    }

    /**
     * Track a search event
     */
    trackSearch(query, resultsCount) {
      this.trackEvent('search', {
        query,
        results_count: resultsCount
      });
    }

    /**
     * Track a custom event
     */
    trackEvent(eventType, properties = {}) {
      if (!this.isTracking) {
        return;
      }

      this.updateActivity();

      const eventData = {
        event_type: eventType,
        session_id: this.sessionId,
        page_url: window.location.href,
        referrer: document.referrer || null,
        properties
      };

      // Send event to API
      this.sendEvent(eventData);
    }

    /**
     * Send event to analytics API
     */
    async sendEvent(eventData) {
      try {
        const response = await fetch(`${FN_BASE}/analytics-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Include auth token if available
            ...(localStorage.getItem('accessToken') && {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            })
          },
          body: JSON.stringify(eventData)
        });

        if (!response.ok) {
          console.warn('Failed to send analytics event:', response.status);
        }
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.debug('Analytics tracking error:', error);
      }
    }

    /**
     * Enable tracking
     */
    enable() {
      this.isTracking = true;
      try {
        localStorage.setItem('analytics_consent', 'true');
      } catch (e) {
        console.warn('Failed to save consent preference:', e);
      }

      if (!this.sessionId) {
        this.sessionId = this.getOrCreateSession();
        this.init();
      }
    }

    /**
     * Disable tracking
     */
    disable() {
      this.isTracking = false;
      try {
        localStorage.setItem('analytics_consent', 'false');
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to save consent preference:', e);
      }
    }
  }

  // Initialize global tracker
  window.AnalyticsTracker = new AnalyticsTracker();

  // Expose public API
  window.analytics = {
    track: (eventType, properties) => window.AnalyticsTracker.trackEvent(eventType, properties),
    trackSearch: (query, resultsCount) => window.AnalyticsTracker.trackSearch(query, resultsCount),
    enable: () => window.AnalyticsTracker.enable(),
    disable: () => window.AnalyticsTracker.disable(),
    getSessionId: () => window.AnalyticsTracker.sessionId
  };
})();
