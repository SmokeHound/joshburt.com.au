/**
 * Theme Settings UI Components
 * Provides UI for theme preview and custom builder
 */

(function () {
  'use strict';

  /**
   * Initialize theme preview buttons
   */
  function initThemePreview() {
    const themeCards = document.querySelectorAll('.theme-card');

    themeCards.forEach(card => {
      const themeId = card.getAttribute('data-theme');

      // Add preview button
      const previewBtn = document.createElement('button');
      previewBtn.className =
        'absolute top-2 right-2 px-3 py-1 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 transition-all opacity-0 group-hover:opacity-100';
      previewBtn.textContent = 'Preview';
      previewBtn.setAttribute('aria-label', `Preview ${themeId} theme`);

      previewBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (window.ThemeEnhanced) {
          window.ThemeEnhanced.preview(themeId);
        }
      });

      card.appendChild(previewBtn);
    });
  }

  /**
   * Initialize custom theme builder UI
   */
  function initCustomThemeBuilder() {
    const builderContainer = document.getElementById('custom-theme-builder');
    if (!builderContainer || !window.ThemeEnhanced) {
      return;
    }

    const customTheme = window.ThemeEnhanced.customBuilder.getTheme();

    const rgbToHex = (value) => {
      if (!value) {
        return null;
      }
      const v = String(value).trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
        return v;
      }
      if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
        return (
          '#' +
          v
            .replace('#', '')
            .split('')
            .map(c => c + c)
            .join('')
        );
      }
      const m = v.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i);
      if (!m) {
        return null;
      }
      const toHex = (n) => {
        const clamped = Math.max(0, Math.min(255, parseInt(n, 10)));
        return clamped.toString(16).padStart(2, '0');
      };
      return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
    };

    const getCssVarHex = (name) => {
      try {
        return rgbToHex(getComputedStyle(document.documentElement).getPropertyValue(name));
      } catch (_) {
        return null;
      }
    };

    const navBgDefault =
      customTheme.colors.navBg || getCssVarHex('--token-nav-bg') || customTheme.colors.primary;
    const navTextDefault =
      customTheme.colors.navText ||
      getCssVarHex('--token-nav-text') ||
      getCssVarHex('--token-text-secondary') ||
      '#cccccc';

    builderContainer.innerHTML = `
      <div class="card p-6 border border-gray-700">
        <h3 class="text-lg font-bold text-white mb-4">Custom Theme Builder</h3>
        <p class="text-sm text-gray-400 mb-6">Create your own color palette</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="custom-primary" class="block text-sm font-medium text-gray-300 mb-2">
              Primary Color
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-primary" value="${customTheme.colors.primary}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-primary-text" value="${customTheme.colors.primary}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>
          
          <div>
            <label for="custom-secondary" class="block text-sm font-medium text-gray-300 mb-2">
              Secondary Color
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-secondary" value="${customTheme.colors.secondary}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-secondary-text" value="${customTheme.colors.secondary}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>
          
          <div>
            <label for="custom-accent" class="block text-sm font-medium text-gray-300 mb-2">
              Accent Color
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-accent" value="${customTheme.colors.accent}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-accent-text" value="${customTheme.colors.accent}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="pt-2 border-t border-gray-700/60 md:col-span-2"></div>

          <div>
            <label for="custom-navBg" class="block text-sm font-medium text-gray-300 mb-2">
              Nav Background
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-navBg" value="${navBgDefault}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-navBg-text" value="${navBgDefault}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div>
            <label for="custom-navText" class="block text-sm font-medium text-gray-300 mb-2">
              Nav Text
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-navText" value="${navTextDefault}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-navText-text" value="${navTextDefault}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="pt-2 border-t border-gray-700/60 md:col-span-2"></div>

          <div>
            <label for="custom-buttonPrimary" class="block text-sm font-medium text-gray-300 mb-2">
              Button Primary
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-buttonPrimary" value="${customTheme.colors.buttonPrimary}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-buttonPrimary-text" value="${customTheme.colors.buttonPrimary}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div>
            <label for="custom-buttonSecondary" class="block text-sm font-medium text-gray-300 mb-2">
              Button Secondary
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-buttonSecondary" value="${customTheme.colors.buttonSecondary}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-buttonSecondary-text" value="${customTheme.colors.buttonSecondary}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div>
            <label for="custom-buttonDanger" class="block text-sm font-medium text-gray-300 mb-2">
              Button Danger
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-buttonDanger" value="${customTheme.colors.buttonDanger}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-buttonDanger-text" value="${customTheme.colors.buttonDanger}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div>
            <label for="custom-buttonSuccess" class="block text-sm font-medium text-gray-300 mb-2">
              Button Success
            </label>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-buttonSuccess" value="${customTheme.colors.buttonSuccess}" 
                class="w-16 h-16 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-buttonSuccess-text" value="${customTheme.colors.buttonSuccess}" 
                class="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-700 font-mono text-sm" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>
          
          <div class="flex flex-col md:flex-row gap-3 pt-4 md:col-span-2">
            <button id="apply-custom-theme" class="w-full md:flex-1 ui-btn ui-btn-primary px-4 py-3 rounded-lg">
              Apply Custom Theme
            </button>
            <button id="reset-custom-theme" class="w-full md:w-auto ui-btn ui-btn-secondary px-4 py-3 rounded-lg">
              Reset
            </button>
          </div>
        </div>
      </div>
    `;

    // Sync color picker and text input
    ['primary', 'secondary', 'accent', 'navBg', 'navText', 'buttonPrimary', 'buttonSecondary', 'buttonDanger', 'buttonSuccess'].forEach(colorType => {
      const colorInput = document.getElementById(`custom-${colorType}`);
      const textInput = document.getElementById(`custom-${colorType}-text`);

      if (!colorInput || !textInput) {
        return;
      }

      colorInput.addEventListener('input', e => {
        textInput.value = e.target.value;
      });

      textInput.addEventListener('input', e => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
          colorInput.value = e.target.value;
        }
      });
    });

    // Apply custom theme
    document.getElementById('apply-custom-theme').addEventListener('click', () => {
      const colors = {
        primary: document.getElementById('custom-primary').value,
        secondary: document.getElementById('custom-secondary').value,
        accent: document.getElementById('custom-accent').value,
        navBg: document.getElementById('custom-navBg').value,
        navText: document.getElementById('custom-navText').value,
        buttonPrimary: document.getElementById('custom-buttonPrimary').value,
        buttonSecondary: document.getElementById('custom-buttonSecondary').value,
        buttonDanger: document.getElementById('custom-buttonDanger').value,
        buttonSuccess: document.getElementById('custom-buttonSuccess').value
      };

      window.ThemeEnhanced.customBuilder.updateColors(colors);
      window.ThemeEnhanced.customBuilder.apply();

      if (window.A11y) {
        window.A11y.announce('Custom theme applied');
      }
    });

    // Reset custom theme
    document.getElementById('reset-custom-theme').addEventListener('click', () => {
      if (confirm('Reset custom theme to defaults?')) {
        window.ThemeEnhanced.customBuilder.reset();
        initCustomThemeBuilder(); // Refresh UI

        if (window.A11y) {
          window.A11y.announce('Custom theme reset to defaults');
        }
      }
    });
  }

  // Initialize all theme UI components when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initThemePreview();
      initCustomThemeBuilder();
    });
  } else {
    initThemePreview();
    initCustomThemeBuilder();
  }

  // Expose init functions for dynamic loading
  window.ThemeUI = {
    initThemePreview,
    initCustomThemeBuilder
  };
})();
