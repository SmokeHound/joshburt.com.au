// Client Error Tracker Loader
// Loads /assets/js/client-error-tracker.js only when not already present.
(function(){
  const TRACKER_SRC = '/assets/js/client-error-tracker.js';
  const LOADER_ID = 'client-error-tracker-loader';

  function isTrackerPresent(){
    if (typeof window !== 'undefined' && window.ErrorTracker) return true;
    try {
      if (document.querySelector(`script[src="${TRACKER_SRC}"]`)) return true;
    } catch(e) { /* ignore */ }
    return false;
  }

  function injectTracker(){
    if (isTrackerPresent()) return;
    try {
      // Prevent double-insert
      if (document.getElementById(LOADER_ID + '-script')) return;
      const s = document.createElement('script');
      s.id = LOADER_ID + '-script';
      s.src = TRACKER_SRC;
      s.async = true;
      s.onload = function(){
        try { console.debug('Client error tracker loaded'); } catch(_){ /* ignore */ }
      };
      s.onerror = function(){
        // If load fails, schedule one retry after a short delay
        setTimeout(function(){
          if (!isTrackerPresent()) {
            const r = document.createElement('script');
            r.src = TRACKER_SRC;
            r.async = true;
            document.head.appendChild(r);
          }
        }, 2000);
      };
      document.head.appendChild(s);
    } catch(e){ /* noop */ }
  }

  // If DOM already ready, inject immediately; otherwise wait for DOMContentLoaded.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    injectTracker();
  } else {
    document.addEventListener('DOMContentLoaded', injectTracker);
  }
})();
