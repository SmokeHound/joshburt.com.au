// assets/js/audit.js
// Centralized audit logging helper for serverless backend; falls back gracefully.
window.Audit = {
  async log(action, entity, details) {
    try {
      const base = window.FN_BASE || '/.netlify/functions';
      await fetch(`${base}/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entity, details })
      });
    } catch (e) {
      // fallback: store last audit in localStorage for debugging
      try {
        localStorage.setItem(
          'lastAudit',
          JSON.stringify({ ts: Date.now(), action, entity, details })
        );
      } catch (_) {
        /* ignore quota or storage errors */
      }
    }
  },

  // Track page visits - includes page title, path, referrer, and session info
  async trackPageVisit() {
    try {
      // Don't track if user is not logged in (optional - can be removed to track all visits)
      const token = window.getToken && window.getToken();
      if (!token) {return;}

      // Debounce page visits - don't log same page within 30 seconds
      const lastVisit = sessionStorage.getItem('lastPageVisit');
      const currentPath = window.location.pathname;
      if (lastVisit) {
        try {
          const { path, time } = JSON.parse(lastVisit);
          if (path === currentPath && Date.now() - time < 30000) {
            return; // Skip duplicate visit within 30s
          }
        } catch (_) {
          /* ignore parse errors */
        }
      }

      const base = window.FN_BASE || '/.netlify/functions';
      const pageInfo = {
        path: currentPath,
        title: document.title || 'Untitled',
        referrer: document.referrer || null,
        query: window.location.search || null,
        hash: window.location.hash || null,
        screenWidth: window.screen?.width,
        screenHeight: window.screen?.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        timestamp: new Date().toISOString()
      };

      // Get user info for context
      let userId = null;
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        userId = user.id || null;
      } catch (_) {
        /* ignore */
      }

      await fetch(`${base}/audit-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          action: 'page.visit',
          userId,
          details: pageInfo
        })
      });

      // Store last visit to prevent duplicates
      sessionStorage.setItem(
        'lastPageVisit',
        JSON.stringify({ path: currentPath, time: Date.now() })
      );
    } catch (e) {
      // Non-fatal: don't break page load for tracking errors
      console.debug('Page visit tracking skipped:', e.message);
    }
  }
};

// Auto-track page visits when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    // Small delay to ensure auth is initialized
    setTimeout(() => {
      if (window.Audit && window.Audit.trackPageVisit) {
        window.Audit.trackPageVisit();
      }
    }, 500);
  });
}
