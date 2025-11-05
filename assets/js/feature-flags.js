/**
 * Feature Flags Utility
 * Checks feature flag status from settings API
 */

(function() {
  'use strict';

  // Cache for feature flags
  let featureFlagsCache = null;
  let cacheTimestamp = 0;
  const CACHE_DURATION = 60000; // Cache for 1 minute
  const LS_KEY = 'site.featureFlags.cache';
  const LS_TS_KEY = 'site.featureFlags.cache.ts';

  function getCandidateBases() {
    const bases = [];
    if (window.FN_BASE) {bases.push(String(window.FN_BASE));}
    bases.push('/netlify/functions');
    const host = (location && location.hostname) || '';
    if (/localhost|127\.0\.0\.1/.test(host)) {
      bases.push('http://localhost:8888/netlify/functions');
      bases.push('http://127.0.0.1:8888/netlify/functions');
    }
    return Array.from(new Set(bases));
  }

  async function fetchJsonWithTimeout(url, opts = {}, timeoutMs = 5000, fetchImpl) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const _fetch = typeof fetchImpl === 'function' ? fetchImpl : fetch;
      const res = await _fetch(url, { ...opts, signal: ctrl.signal });
      if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  /**
     * Fetch feature flags from settings API
     * @returns {Promise<Object>} Feature flags object
     */
  async function fetchFeatureFlags() {
    const now = Date.now();

    // Return cached flags if still valid
    if (featureFlagsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return featureFlagsCache;
    }

    try {
      const bases = getCandidateBases();
      let settings = null;
      let lastErr = null;
      for (const base of bases) {
        try {
          const useAuthFetch = (typeof window !== 'undefined' && typeof window.authFetch === 'function') ? window.authFetch : null;
          // Give a bit more time; this runs in the background and shouldn't spam logs on slow links
          settings = await fetchJsonWithTimeout(`${base}/settings`, { headers: { 'Accept': 'application/json' } }, 10000, useAuthFetch);
          if (settings) {break;}
        } catch (e) {
          lastErr = e;
          // try next candidate
        }
      }
      if (!settings) {
        // Attempt to use localStorage cached flags if available
        const lsTs = parseInt(localStorage.getItem(LS_TS_KEY) || '0', 10);
        const lsRaw = localStorage.getItem(LS_KEY);
        if (lsRaw && (now - lsTs) < 5 * CACHE_DURATION) {
          try { featureFlagsCache = JSON.parse(lsRaw); cacheTimestamp = lsTs; return featureFlagsCache; } catch (_) { /* ignore */ }
        }
        // Downgrade AbortError noise to debug and fail closed to defaults
        if (lastErr && lastErr.name === 'AbortError') {
          console.debug('Feature flags fetch aborted (timeout). Using defaults or cache.');
        } else if (lastErr) {
          console.warn('Failed to fetch settings for feature flags', lastErr);
        }
        return { betaFeatures: false, newDashboard: false, advancedReports: false };
      }
      const nestedFlags = settings.featureFlags || {};
      // Merge in legacy top-level toggles for backward compatibility
      const merged = {
        betaFeatures: !!nestedFlags.betaFeatures,
        newDashboard: !!nestedFlags.newDashboard,
        advancedReports: !!nestedFlags.advancedReports,
        enableRegistration: nestedFlags.enableRegistration !== undefined ? !!nestedFlags.enableRegistration : !!settings.enableRegistration,
        enableGuestCheckout: nestedFlags.enableGuestCheckout !== undefined ? !!nestedFlags.enableGuestCheckout : !!settings.enableGuestCheckout
      };
      featureFlagsCache = merged;
      cacheTimestamp = now;
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(merged));
        localStorage.setItem(LS_TS_KEY, String(now));
      } catch (_) { /* no-op */ }

      return featureFlagsCache;
    } catch (error) {
      // Try local cache as last resort
      try {
        const lsTs = parseInt(localStorage.getItem(LS_TS_KEY) || '0', 10);
        const lsRaw = localStorage.getItem(LS_KEY);
        if (lsRaw && (Date.now() - lsTs) < 24 * 60 * 60 * 1000) { // accept up to 24h-old cache on failure
          return JSON.parse(lsRaw);
        }
      } catch (_) { /* ignore */ }
      console.error('Error fetching feature flags:', error);
      return { betaFeatures: false, newDashboard: false, advancedReports: false };
    }
  }

  /**
     * Check if a specific feature flag is enabled
     * @param {string} flagName - Name of the feature flag
     * @returns {Promise<boolean>} True if enabled, false otherwise
     */
  async function isFeatureEnabled(flagName) {
    const flags = await fetchFeatureFlags();
    return flags[flagName] === true;
  }

  /**
     * Clear the feature flags cache (useful after settings update)
     */
  function clearCache() {
    featureFlagsCache = null;
    cacheTimestamp = 0;
  }

  /**
     * Show/hide elements based on feature flag
     * @param {string} selector - CSS selector for elements
     * @param {string} flagName - Name of the feature flag
     */
  async function toggleFeatureElements(selector, flagName) {
    const enabled = await isFeatureEnabled(flagName);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      if (enabled) {
        element.classList.remove('hidden');
        element.style.display = '';
      } else {
        element.classList.add('hidden');
        element.style.display = 'none';
      }
    });
  }

  // Expose public API
  window.FeatureFlags = {
    isEnabled: isFeatureEnabled,
    fetch: fetchFeatureFlags,
    clearCache: clearCache,
    toggleElements: toggleFeatureElements
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchFeatureFlags);
  } else {
    fetchFeatureFlags();
  }
})();
