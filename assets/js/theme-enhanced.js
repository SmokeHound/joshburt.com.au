/**
 * Enhanced Theme System with Preview and Custom Builder
 * Extends the base ThemeManager with admin-only helpers (Settings page).
 */

(function () {
  'use strict';

  function initEnhancedTheme() {
    if (typeof window.Theme === 'undefined') {
      if (!window._themeEnhancedRetryCount) {
        window._themeEnhancedRetryCount = 0;
      }
      if (window._themeEnhancedRetryCount < 20) {
        window._themeEnhancedRetryCount++;
        setTimeout(initEnhancedTheme, 100);
        return;
      }
      console.warn('Theme manager not loaded after retries, enhanced features disabled');
      return;
    }

    delete window._themeEnhancedRetryCount;

    class ThemePreview {
      constructor() {
        this.previewContainer = null;
        this.previewCard = null;
      }

      createPreviewModal(themeId) {
        this.destroy();

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

        const title = document.createElement('h2');
        title.id = 'theme-preview-title';
        title.textContent = `Theme Preview: ${themeId.charAt(0).toUpperCase() + themeId.slice(1)}`;
        title.className = 'text-2xl font-bold mb-4';

        const previewCard = document.createElement('div');
        previewCard.className = 'card p-6 mb-6 border theme-transition';
        previewCard.innerHTML = `
          <h3 class="text-xl font-bold mb-2">Sample Card</h3>
          <p class="text-gray-400 mb-4">This is how your content will look with this theme.</p>
          <div class="flex gap-3 mb-4">
            <button class="ui-btn ui-btn-primary px-4 py-2 rounded-lg">Primary Button</button>
            <button class="ui-btn ui-btn-secondary px-4 py-2 rounded-lg">Secondary Button</button>
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

        const actions = document.createElement('div');
        actions.className = 'flex gap-3 justify-end';
        actions.innerHTML = `
          <button id="preview-cancel" class="ui-btn ui-btn-secondary px-4 py-2 rounded-lg">Cancel</button>
          <button id="preview-apply" class="ui-btn ui-btn-primary px-4 py-2 rounded-lg">Apply Theme</button>
        `;

        container.appendChild(title);
        container.appendChild(previewCard);
        container.appendChild(actions);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        this.previewContainer = overlay;
        this.previewCard = previewCard;

        // Apply preview theme temporarily
        window.Theme.setTheme(themeId, false);

        document.getElementById('preview-cancel').addEventListener('click', () => {
          this.destroy();
          window.Theme.applyFromStorage();
        });

        document.getElementById('preview-apply').addEventListener('click', () => {
          window.Theme.setTheme(themeId, true);
          this.destroy();
          if (window.A11y) {
            window.A11y.announce(`Theme changed to ${themeId}`);
          }
        });

        overlay.addEventListener('click', e => {
          if (e.target === overlay) {
            this.destroy();
            window.Theme.applyFromStorage();
          }
        });

        const escapeHandler = e => {
          if (e.key === 'Escape') {
            this.destroy();
            window.Theme.applyFromStorage();
            document.removeEventListener('keydown', escapeHandler);
          }
        };
        document.addEventListener('keydown', escapeHandler);

        if (window.A11y && window.A11y.trapFocus) {
          window.A11y.trapFocus(container);
        }
      }

      destroy() {
        if (this.previewContainer) {
          this.previewContainer.remove();
          this.previewContainer = null;
          this.previewCard = null;
        }
      }
    }

    class CustomThemeBuilder {
      constructor() {
        this.customTheme = this.loadFromThemeManager();
      }

      loadFromThemeManager() {
        try {
          if (window.Theme && typeof window.Theme.getActiveTheme === 'function') {
            const active = window.Theme.getActiveTheme();
            if (active && active.colors) {
              return { name: 'Custom', colors: { ...active.colors } };
            }
          }
        } catch (e) {
          console.error('Failed to read active theme:', e);
        }

        return {
          name: 'Custom',
          colors: {
            primary: '#3b82f6',
            secondary: '#10b981',
            accent: '#8b5cf6',
            buttonPrimary: '#3b82f6',
            buttonSecondary: '#10b981',
            buttonDanger: '#ef4444',
            buttonSuccess: '#22c55e'
          }
        };
      }

      updateColors(colors) {
        this.customTheme.colors = {
          ...this.customTheme.colors,
          ...colors
        };
      }

      apply() {
        if (window.Theme && typeof window.Theme.setPalette === 'function') {
          window.Theme.setPalette(this.customTheme.colors, true);
        }
      }

      getTheme() {
        this.customTheme = this.loadFromThemeManager();
        return this.customTheme;
      }

      reset() {
        try {
          const siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
          delete siteSettings.primaryColor;
          delete siteSettings.secondaryColor;
          delete siteSettings.accentColor;
          delete siteSettings.navBgColor;
          delete siteSettings.navTextColor;
          delete siteSettings.buttonPrimaryColor;
          delete siteSettings.buttonSecondaryColor;
          delete siteSettings.buttonDangerColor;
          delete siteSettings.buttonSuccessColor;
          delete siteSettings.bgPrimaryColor;
          delete siteSettings.bgSecondaryColor;
          delete siteSettings.bgTertiaryColor;
          delete siteSettings.bgElevatedColor;
          delete siteSettings.borderDefaultColor;
          delete siteSettings.borderHoverColor;
          delete siteSettings.borderFocusColor;
          delete siteSettings.textPrimaryColor;
          delete siteSettings.textSecondaryColor;
          delete siteSettings.textMutedColor;
          delete siteSettings.textOnPrimaryColor;
          delete siteSettings.textOnSecondaryColor;
          delete siteSettings.textOnAccentColor;
          delete siteSettings.textOnDangerColor;
          delete siteSettings.warningColor;
          delete siteSettings.infoColor;
          delete siteSettings.radiusMd;
          delete siteSettings.shadowPreset;
          delete siteSettings.spacingScale;
          delete siteSettings.fontScale;
          delete siteSettings.baseFontWeight;
          localStorage.setItem('siteSettings', JSON.stringify(siteSettings));

          localStorage.removeItem('primaryColor');
          localStorage.removeItem('secondaryColor');
          localStorage.removeItem('accentColor');
          localStorage.removeItem('navBgColor');
          localStorage.removeItem('navTextColor');
          localStorage.removeItem('buttonPrimaryColor');
          localStorage.removeItem('buttonSecondaryColor');
          localStorage.removeItem('buttonDangerColor');
          localStorage.removeItem('buttonSuccessColor');
          localStorage.removeItem('bgPrimaryColor');
          localStorage.removeItem('bgSecondaryColor');
          localStorage.removeItem('bgTertiaryColor');
          localStorage.removeItem('bgElevatedColor');
          localStorage.removeItem('borderDefaultColor');
          localStorage.removeItem('borderHoverColor');
          localStorage.removeItem('borderFocusColor');
          localStorage.removeItem('textPrimaryColor');
          localStorage.removeItem('textSecondaryColor');
          localStorage.removeItem('textMutedColor');
          localStorage.removeItem('textOnPrimaryColor');
          localStorage.removeItem('textOnSecondaryColor');
          localStorage.removeItem('textOnAccentColor');
          localStorage.removeItem('textOnDangerColor');
          localStorage.removeItem('warningColor');
          localStorage.removeItem('infoColor');
          localStorage.removeItem('radiusMd');
          localStorage.removeItem('shadowPreset');
          localStorage.removeItem('spacingScale');
          localStorage.removeItem('fontScale');
          localStorage.removeItem('baseFontWeight');
        } catch (_) {
          // Ignore storage errors
        }

        if (window.Theme && typeof window.Theme.applyFromStorage === 'function') {
          window.Theme.applyFromStorage();
        }
      }
    }

    const themePreview = new ThemePreview();
    const customThemeBuilder = new CustomThemeBuilder();

    window.ThemeEnhanced = {
      preview: themeId => themePreview.createPreviewModal(themeId),
      customBuilder: customThemeBuilder
    };

    console.log('Enhanced theme system loaded');
  }

  initEnhancedTheme();
})();
