/**
 * Enhanced Theme System with Preview and Scheduling
 * Extends the base theme manager with advanced features
 */

(function () {
  'use strict';

  // Wait for base ThemeManager to be available with retry logic
  function initEnhancedTheme() {
    if (typeof window.Theme === 'undefined') {
      // Retry after a short delay to allow shared-theme.html to load
      if (!window._themeEnhancedRetryCount) {
        window._themeEnhancedRetryCount = 0;
      }
      if (window._themeEnhancedRetryCount < 20) {
        window._themeEnhancedRetryCount++;
        setTimeout(initEnhancedTheme, 100);
        return;
      } else {
        console.warn('Theme manager not loaded after retries, enhanced features disabled');
        return;
      }
    }

    // Theme manager is now available, proceed with initialization
    delete window._themeEnhancedRetryCount;

  /**
   * Theme Preview Component
   * Shows a live preview of how the theme will look
   */
  class ThemePreview {
    constructor() {
      this.previewContainer = null;
      this.previewCard = null;
    }

    /**
     * Create preview modal
     */
    createPreviewModal(themeId) {
      // Remove existing preview
      this.destroy();

      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.id = 'theme-preview-modal';
      overlay.className = 'modal-overlay theme-transition';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 1rem;
      `;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'theme-preview-title');

      // Create preview container
      const container = document.createElement('div');
      container.className = 'card theme-transition';
      container.style.cssText = `
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        padding: 2rem;
        border-radius: 12px;
      `;

      // Preview title
      const title = document.createElement('h2');
      title.id = 'theme-preview-title';
      title.textContent = `Theme Preview: ${themeId.charAt(0).toUpperCase() + themeId.slice(1)}`;
      title.className = 'text-2xl font-bold mb-4';

      // Preview card with sample content
      const previewCard = document.createElement('div');
      previewCard.className = 'card p-6 mb-6 border theme-transition';
      previewCard.innerHTML = `
        <h3 class="text-xl font-bold mb-2">Sample Card</h3>
        <p class="text-gray-400 mb-4">This is how your content will look with this theme.</p>
        <div class="flex gap-3 mb-4">
          <button class="btn-neon-blue px-4 py-2 rounded-lg">Primary Button</button>
          <button class="btn-neon-green px-4 py-2 rounded-lg">Secondary Button</button>
        </div>
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Primary Color</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-green-500 rounded"></div>
            <span>Secondary Color</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-purple-500 rounded"></div>
            <span>Accent Color</span>
          </div>
        </div>
      `;

      // Action buttons
      const actions = document.createElement('div');
      actions.className = 'flex gap-3 justify-end';
      actions.innerHTML = `
        <button id="preview-cancel" class="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors">
          Cancel
        </button>
        <button id="preview-apply" class="px-4 py-2 rounded-lg btn-neon-blue">
          Apply Theme
        </button>
      `;

      container.appendChild(title);
      container.appendChild(previewCard);
      container.appendChild(actions);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      this.previewContainer = overlay;
      this.previewCard = previewCard;

      // Apply preview theme temporarily
      this.applyPreview(themeId);

      // Event listeners
      document.getElementById('preview-cancel').addEventListener('click', () => {
        this.destroy();
        // Restore original theme
        window.Theme.applyFromStorage();
      });

      document.getElementById('preview-apply').addEventListener('click', () => {
        window.Theme.setTheme(themeId, true);
        this.destroy();
        if (window.A11y) {
          window.A11y.announce(`Theme changed to ${themeId}`);
        }
      });

      // Close on overlay click
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          this.destroy();
          window.Theme.applyFromStorage();
        }
      });

      // Close on Escape key
      const escapeHandler = e => {
        if (e.key === 'Escape') {
          this.destroy();
          window.Theme.applyFromStorage();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);

      // Trap focus in modal
      if (window.A11y && window.A11y.trapFocus) {
        window.A11y.trapFocus(container);
      }
    }

    /**
     * Apply theme for preview only
     */
    applyPreview(themeId) {
      window.Theme.setTheme(themeId, false);
    }

    /**
     * Destroy preview modal
     */
    destroy() {
      if (this.previewContainer) {
        this.previewContainer.remove();
        this.previewContainer = null;
        this.previewCard = null;
      }
    }
  }

  /**
   * Theme Scheduler
   * Automatically switch themes based on time of day
   */
  class ThemeScheduler {
    constructor() {
      this.schedules = this.loadSchedules();
      this.currentSchedule = null;
      this.checkInterval = null;
    }

    /**
     * Load schedules from localStorage
     */
    loadSchedules() {
      try {
        const saved = localStorage.getItem('themeSchedules');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load theme schedules:', e);
      }

      // Default schedules
      return {
        enabled: false,
        schedules: [
          { name: 'Morning', start: '06:00', end: '12:00', theme: 'light' },
          { name: 'Afternoon', start: '12:00', end: '18:00', theme: 'light' },
          { name: 'Evening', start: '18:00', end: '22:00', theme: 'dark' },
          { name: 'Night', start: '22:00', end: '06:00', theme: 'dark' }
        ]
      };
    }

    /**
     * Save schedules to localStorage
     */
    saveSchedules() {
      try {
        localStorage.setItem('themeSchedules', JSON.stringify(this.schedules));
      } catch (e) {
        console.error('Failed to save theme schedules:', e);
      }
    }

    /**
     * Enable automatic theme scheduling
     */
    enable() {
      this.schedules.enabled = true;
      this.saveSchedules();
      this.start();
    }

    /**
     * Disable automatic theme scheduling
     */
    disable() {
      this.schedules.enabled = false;
      this.saveSchedules();
      this.stop();
    }

    /**
     * Start checking schedule
     */
    start() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }

      // Check immediately
      this.checkSchedule();

      // Check every minute
      this.checkInterval = setInterval(() => {
        this.checkSchedule();
      }, 60000); // 1 minute
    }

    /**
     * Stop checking schedule
     */
    stop() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    }

    /**
     * Check current schedule and apply theme
     */
    checkSchedule() {
      if (!this.schedules.enabled) {
        return;
      }

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      for (const schedule of this.schedules.schedules) {
        if (this.isTimeInRange(currentTime, schedule.start, schedule.end)) {
          if (this.currentSchedule !== schedule.name) {
            this.currentSchedule = schedule.name;
            window.Theme.setTheme(schedule.theme, false);

            if (window.A11y) {
              window.A11y.announce(
                `Theme automatically changed to ${schedule.theme} for ${schedule.name}`
              );
            }
          }
          break;
        }
      }
    }

    /**
     * Check if current time is in schedule range
     */
    isTimeInRange(current, start, end) {
      const currentMinutes = this.timeToMinutes(current);
      const startMinutes = this.timeToMinutes(start);
      const endMinutes = this.timeToMinutes(end);

      // Handle overnight schedules (e.g., 22:00 to 06:00)
      if (endMinutes < startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }

      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    /**
     * Convert time string to minutes
     */
    timeToMinutes(time) {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    }

    /**
     * Update a schedule
     */
    updateSchedule(index, schedule) {
      if (index >= 0 && index < this.schedules.schedules.length) {
        this.schedules.schedules[index] = schedule;
        this.saveSchedules();
        if (this.schedules.enabled) {
          this.checkSchedule();
        }
      }
    }

    /**
     * Get all schedules
     */
    getSchedules() {
      return this.schedules;
    }
  }

  /**
   * Custom Theme Builder
   * Allows users to create custom color palettes
   */
  class CustomThemeBuilder {
    constructor() {
      this.customTheme = this.loadCustomTheme();
    }

    /**
     * Load custom theme from localStorage
     */
    loadCustomTheme() {
      try {
        const saved = localStorage.getItem('customTheme');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load custom theme:', e);
      }

      return {
        name: 'Custom',
        colors: {
          primary: '#3b82f6',
          secondary: '#10b981',
          accent: '#8b5cf6'
        }
      };
    }

    /**
     * Save custom theme
     */
    saveCustomTheme() {
      try {
        localStorage.setItem('customTheme', JSON.stringify(this.customTheme));
      } catch (e) {
        console.error('Failed to save custom theme:', e);
      }
    }

    /**
     * Update custom colors
     */
    updateColors(colors) {
      this.customTheme.colors = {
        ...this.customTheme.colors,
        ...colors
      };
      this.saveCustomTheme();
    }

    /**
     * Apply custom theme
     */
    apply() {
      window.Theme.setPalette(this.customTheme.colors, true);
    }

    /**
     * Get custom theme
     */
    getTheme() {
      return this.customTheme;
    }

    /**
     * Reset to defaults
     */
    reset() {
      this.customTheme = {
        name: 'Custom',
        colors: {
          primary: '#3b82f6',
          secondary: '#10b981',
          accent: '#8b5cf6'
        }
      };
      this.saveCustomTheme();
    }
  }

  /**
   * Per-Page Theme Override
   * Allows different themes for different pages
   */
  class PageThemeOverride {
    constructor() {
      this.overrides = this.loadOverrides();
    }

    /**
     * Load overrides from localStorage
     */
    loadOverrides() {
      try {
        const saved = localStorage.getItem('pageThemeOverrides');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load page theme overrides:', e);
      }
      return {};
    }

    /**
     * Save overrides to localStorage
     */
    saveOverrides() {
      try {
        localStorage.setItem('pageThemeOverrides', JSON.stringify(this.overrides));
      } catch (e) {
        console.error('Failed to save page theme overrides:', e);
      }
    }

    /**
     * Set override for current page
     */
    setCurrentPageOverride(themeId) {
      const page = this.getCurrentPage();
      this.overrides[page] = themeId;
      this.saveOverrides();
      window.Theme.setTheme(themeId, false);
    }

    /**
     * Get override for current page
     */
    getCurrentPageOverride() {
      const page = this.getCurrentPage();
      return this.overrides[page];
    }

    /**
     * Remove override for current page
     */
    removeCurrentPageOverride() {
      const page = this.getCurrentPage();
      delete this.overrides[page];
      this.saveOverrides();
      window.Theme.applyFromStorage();
    }

    /**
     * Get current page identifier
     */
    getCurrentPage() {
      return window.location.pathname.split('/').pop() || 'index.html';
    }

    /**
     * Check and apply page override on load
     */
    applyIfOverridden() {
      const override = this.getCurrentPageOverride();
      if (override) {
        window.Theme.setTheme(override, false);
        return true;
      }
      return false;
    }
  }

  // Initialize and expose enhanced theme features
  const themePreview = new ThemePreview();
  const themeScheduler = new ThemeScheduler();
  const customThemeBuilder = new CustomThemeBuilder();
  const pageThemeOverride = new PageThemeOverride();

  // Check for page override on load
  if (!pageThemeOverride.applyIfOverridden()) {
    // Check for scheduled theme
    if (themeScheduler.schedules.enabled) {
      themeScheduler.start();
    }
  }

  // Expose enhanced API
  window.ThemeEnhanced = {
    preview: themeId => themePreview.createPreviewModal(themeId),
    scheduler: themeScheduler,
    customBuilder: customThemeBuilder,
    pageOverride: pageThemeOverride
  };

  console.log('Enhanced theme system loaded');
  }

  // Start initialization (will retry if Theme manager not ready)
  initEnhancedTheme();
})();
