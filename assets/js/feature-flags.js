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
      const base = (window.FN_BASE || '/.netlify/functions');
      const response = await fetch(`${base}/settings`);
      if (!response.ok) {
        console.warn('Failed to fetch settings for feature flags');
        return { betaFeatures: false, newDashboard: false, advancedReports: false };
      }

      const settings = await response.json();
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

      return featureFlagsCache;
    } catch (error) {
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
