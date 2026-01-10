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

    const bgPrimaryDefault =
      customTheme.colors.bgPrimary || getCssVarHex('--token-bg-primary') || '#0b0b0b';
    const bgSecondaryDefault =
      customTheme.colors.bgSecondary || getCssVarHex('--token-bg-secondary') || '#141414';
    const bgElevatedDefault =
      customTheme.colors.bgElevated || getCssVarHex('--token-bg-elevated') || '#1c1c1c';

    const borderDefaultDefault =
      customTheme.colors.borderDefault || getCssVarHex('--token-border-default') || '#333333';
    const borderHoverDefault =
      customTheme.colors.borderHover || getCssVarHex('--token-border-hover') || customTheme.colors.primary;
    const borderFocusDefault =
      customTheme.colors.borderFocus || getCssVarHex('--token-border-focus') || customTheme.colors.primary;

    const textPrimaryDefault =
      customTheme.colors.textPrimary || getCssVarHex('--token-text-primary') || '#f5f5f5';
    const textSecondaryDefault =
      customTheme.colors.textSecondary || getCssVarHex('--token-text-secondary') || '#cccccc';
    const textMutedDefault =
      customTheme.colors.textMuted || getCssVarHex('--token-text-muted') || '#888888';

    const warningDefault =
      customTheme.colors.warning || getCssVarHex('--token-color-warning') || '#f59e0b';
    const infoDefault =
      customTheme.colors.info || getCssVarHex('--token-color-info') || customTheme.colors.primary;

    builderContainer.innerHTML = `
      <div class="card p-4 border border-gray-700 rounded-xl bg-gray-900/20">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 class="text-base font-bold text-white">Custom Theme Builder</h3>
            <p class="text-xs text-gray-400 mt-1">Pick colors, then click Apply to preview immediately.</p>
          </div>
          <div class="hidden md:flex items-center gap-2 text-[10px] text-gray-400">
            <span class="px-2 py-0.5 rounded-full bg-gray-800/60 border border-gray-700/60">Core</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-800/60 border border-gray-700/60">Nav</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-800/60 border border-gray-700/60">Surface</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-800/60 border border-gray-700/60">Text</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-800/60 border border-gray-700/60">Status</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-800/60 border border-gray-700/60">Buttons</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="md:col-span-2">
            <h4 class="text-sm font-semibold text-gray-200">Core Palette</h4>
            <p class="text-xs text-gray-500 mt-1">Used across links, highlights, and UI accents.</p>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-primary" class="block text-xs font-medium text-gray-200 mb-1">Primary</label>
            <p class="text-xs text-gray-500 mb-2">Main brand and primary actions.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-primary" value="${customTheme.colors.primary}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-primary-text" value="${customTheme.colors.primary}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-secondary" class="block text-xs font-medium text-gray-200 mb-1">Secondary</label>
            <p class="text-xs text-gray-500 mb-2">Supporting highlights and secondary UI.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-secondary" value="${customTheme.colors.secondary}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-secondary-text" value="${customTheme.colors.secondary}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-accent" class="block text-xs font-medium text-gray-200 mb-1">Accent</label>
            <p class="text-xs text-gray-500 mb-2">Decorative accents and subtle emphasis.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-accent" value="${customTheme.colors.accent}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-accent-text" value="${customTheme.colors.accent}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="md:col-span-2 border-t border-gray-700/60 pt-3"></div>

          <div class="md:col-span-2">
            <h4 class="text-sm font-semibold text-gray-200">Navigation</h4>
            <p class="text-xs text-gray-500 mt-1">Sidebar background and link text.</p>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-navBg" class="block text-xs font-medium text-gray-200 mb-1">Nav Background</label>
            <p class="text-xs text-gray-500 mb-2">Sidebar background color.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-navBg" value="${navBgDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-navBg-text" value="${navBgDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-navText" class="block text-xs font-medium text-gray-200 mb-1">Nav Text</label>
            <p class="text-xs text-gray-500 mb-2">Sidebar link and label color.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-navText" value="${navTextDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-navText-text" value="${navTextDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="md:col-span-2 border-t border-gray-700/60 pt-3"></div>

          <div class="md:col-span-2">
            <h4 class="text-sm font-semibold text-gray-200">Surfaces & Text</h4>
            <p class="text-xs text-gray-500 mt-1">Backgrounds, borders, and text tokens used across the app.</p>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-bgPrimary" class="block text-xs font-medium text-gray-200 mb-1">Background (Primary)</label>
            <p class="text-xs text-gray-500 mb-2">Main page background.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-bgPrimary" value="${bgPrimaryDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-bgPrimary-text" value="${bgPrimaryDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-bgSecondary" class="block text-xs font-medium text-gray-200 mb-1">Background (Secondary)</label>
            <p class="text-xs text-gray-500 mb-2">Alternative background for sections.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-bgSecondary" value="${bgSecondaryDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-bgSecondary-text" value="${bgSecondaryDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-bgElevated" class="block text-xs font-medium text-gray-200 mb-1">Background (Elevated)</label>
            <p class="text-xs text-gray-500 mb-2">Cards, panels, and raised surfaces.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-bgElevated" value="${bgElevatedDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-bgElevated-text" value="${bgElevatedDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-borderDefault" class="block text-xs font-medium text-gray-200 mb-1">Border (Default)</label>
            <p class="text-xs text-gray-500 mb-2">Standard border color.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-borderDefault" value="${borderDefaultDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-borderDefault-text" value="${borderDefaultDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-borderHover" class="block text-xs font-medium text-gray-200 mb-1">Border (Hover)</label>
            <p class="text-xs text-gray-500 mb-2">Hover-state border highlight.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-borderHover" value="${borderHoverDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-borderHover-text" value="${borderHoverDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-borderFocus" class="block text-xs font-medium text-gray-200 mb-1">Border (Focus)</label>
            <p class="text-xs text-gray-500 mb-2">Focus ring / focus border color.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-borderFocus" value="${borderFocusDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-borderFocus-text" value="${borderFocusDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-textPrimary" class="block text-xs font-medium text-gray-200 mb-1">Text (Primary)</label>
            <p class="text-xs text-gray-500 mb-2">Main body text color.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-textPrimary" value="${textPrimaryDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-textPrimary-text" value="${textPrimaryDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-textSecondary" class="block text-xs font-medium text-gray-200 mb-1">Text (Secondary)</label>
            <p class="text-xs text-gray-500 mb-2">Subtext and secondary labels.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-textSecondary" value="${textSecondaryDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-textSecondary-text" value="${textSecondaryDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-textMuted" class="block text-xs font-medium text-gray-200 mb-1">Text (Muted)</label>
            <p class="text-xs text-gray-500 mb-2">Muted UI text (hints, captions).</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-textMuted" value="${textMutedDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-textMuted-text" value="${textMutedDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="md:col-span-2 border-t border-gray-700/60 pt-3"></div>

          <div class="md:col-span-2">
            <h4 class="text-sm font-semibold text-gray-200">Status Colors</h4>
            <p class="text-xs text-gray-500 mt-1">Used for warnings and informational UI.</p>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-warning" class="block text-xs font-medium text-gray-200 mb-1">Warning</label>
            <p class="text-xs text-gray-500 mb-2">Warnings and attention states.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-warning" value="${warningDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-warning-text" value="${warningDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-info" class="block text-xs font-medium text-gray-200 mb-1">Info</label>
            <p class="text-xs text-gray-500 mb-2">Informational states and badges.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-info" value="${infoDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-info-text" value="${infoDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="md:col-span-2 border-t border-gray-700/60 pt-3"></div>

          <div class="md:col-span-2">
            <h4 class="text-sm font-semibold text-gray-200">Buttons</h4>
            <p class="text-xs text-gray-500 mt-1">Primary/secondary/danger/success button backgrounds.</p>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-buttonPrimary" class="block text-xs font-medium text-gray-200 mb-1">Primary</label>
            <p class="text-xs text-gray-500 mb-2">Default call-to-action button.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-buttonPrimary" value="${customTheme.colors.buttonPrimary}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-buttonPrimary-text" value="${customTheme.colors.buttonPrimary}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-buttonSecondary" class="block text-xs font-medium text-gray-200 mb-1">Secondary</label>
            <p class="text-xs text-gray-500 mb-2">Secondary actions and subtle buttons.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-buttonSecondary" value="${customTheme.colors.buttonSecondary}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-buttonSecondary-text" value="${customTheme.colors.buttonSecondary}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-buttonDanger" class="block text-xs font-medium text-gray-200 mb-1">Danger</label>
            <p class="text-xs text-gray-500 mb-2">Destructive actions.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-buttonDanger" value="${customTheme.colors.buttonDanger}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-buttonDanger-text" value="${customTheme.colors.buttonDanger}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-buttonSuccess" class="block text-xs font-medium text-gray-200 mb-1">Success</label>
            <p class="text-xs text-gray-500 mb-2">Positive confirmations and success actions.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-buttonSuccess" value="${customTheme.colors.buttonSuccess}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-buttonSuccess-text" value="${customTheme.colors.buttonSuccess}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="md:col-span-2 border-t border-gray-700/60 pt-3"></div>

          <div class="flex flex-col md:flex-row gap-3 md:col-span-2">
            <button id="apply-custom-theme" class="w-full md:w-auto ui-btn ui-btn-primary px-4 py-2 rounded-lg text-sm">
              Apply Custom Theme
            </button>
            <button id="reset-custom-theme" class="w-full md:w-auto ui-btn ui-btn-secondary px-4 py-2 rounded-lg text-sm">
              Reset
            </button>
          </div>

          <p class="md:col-span-2 text-[11px] text-gray-500">
            Tip: you can paste hex values into the text fields (e.g. <span class="font-mono">#3b82f6</span>).
          </p>
        </div>
      </div>
    `;

    // Sync color picker and text input
    ['primary', 'secondary', 'accent', 'navBg', 'navText', 'bgPrimary', 'bgSecondary', 'bgElevated', 'borderDefault', 'borderHover', 'borderFocus', 'textPrimary', 'textSecondary', 'textMuted', 'warning', 'info', 'buttonPrimary', 'buttonSecondary', 'buttonDanger', 'buttonSuccess'].forEach(colorType => {
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
        bgPrimary: document.getElementById('custom-bgPrimary').value,
        bgSecondary: document.getElementById('custom-bgSecondary').value,
        bgElevated: document.getElementById('custom-bgElevated').value,
        borderDefault: document.getElementById('custom-borderDefault').value,
        borderHover: document.getElementById('custom-borderHover').value,
        borderFocus: document.getElementById('custom-borderFocus').value,
        textPrimary: document.getElementById('custom-textPrimary').value,
        textSecondary: document.getElementById('custom-textSecondary').value,
        textMuted: document.getElementById('custom-textMuted').value,
        warning: document.getElementById('custom-warning').value,
        info: document.getElementById('custom-info').value,
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
