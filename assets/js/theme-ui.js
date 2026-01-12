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

    const getCssVarRaw = (name) => {
      try {
        return String(getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim();
      } catch (_) {
        return '';
      }
    };

    const parseLengthToPx = (value) => {
      if (value === null || value === undefined) {
        return null;
      }
      const raw = String(value).trim();
      if (!raw) {
        return null;
      }
      const m = raw.match(/^(-?\d+(?:\.\d+)?)(px|rem)?$/);
      if (!m) {
        return null;
      }
      const n = parseFloat(m[1]);
      if (!Number.isFinite(n)) {
        return null;
      }
      const unit = m[2] || 'px';
      if (unit === 'rem') {
        return n * 16;
      }
      return n;
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
    const bgTertiaryDefault =
      customTheme.colors.bgTertiary || getCssVarHex('--token-bg-tertiary') || '#1a1a1a';
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

    const textOnPrimaryDefault =
      customTheme.colors.textOnPrimary || getCssVarHex('--token-text-on-primary') || bgPrimaryDefault;
    const textOnSecondaryDefault =
      customTheme.colors.textOnSecondary || getCssVarHex('--token-text-on-secondary') || bgPrimaryDefault;
    const textOnAccentDefault =
      customTheme.colors.textOnAccent || getCssVarHex('--token-text-on-accent') || bgPrimaryDefault;
    const textOnDangerDefault =
      customTheme.colors.textOnDanger || getCssVarHex('--token-text-on-danger') || bgPrimaryDefault;

    const warningDefault =
      customTheme.colors.warning || getCssVarHex('--token-color-warning') || '#f59e0b';
    const infoDefault =
      customTheme.colors.info || getCssVarHex('--token-color-info') || customTheme.colors.primary;

    const radiusMdDefaultPx = (() => {
      const fromTheme = parseLengthToPx(customTheme.colors.radiusMd);
      if (fromTheme !== null) {
        return Math.round(fromTheme);
      }
      const fromCss = parseLengthToPx(getCssVarRaw('--token-radius-md'));
      if (fromCss !== null) {
        return Math.round(fromCss);
      }
      return 8;
    })();

    const shadowPresetDefault = String(customTheme.colors.shadowPreset || '').trim() || 'default';

    const spacingScaleDefault = (() => {
      const raw = customTheme.colors.spacingScale;
      const n = raw === null || raw === undefined ? NaN : parseFloat(String(raw).trim());
      if (!Number.isFinite(n)) {
        return 1;
      }
      return Math.max(0.5, Math.min(1.75, n));
    })();

    const fontScaleDefault = (() => {
      const raw = customTheme.colors.fontScale;
      const n = raw === null || raw === undefined ? NaN : parseFloat(String(raw).trim());
      if (!Number.isFinite(n)) {
        return 1;
      }
      return Math.max(0.5, Math.min(1.75, n));
    })();

    const baseFontWeightDefault = (() => {
      const raw = customTheme.colors.baseFontWeight;
      const n = raw === null || raw === undefined ? NaN : parseInt(String(raw).trim(), 10);
      if (!Number.isFinite(n)) {
        return 400;
      }
      const allowed = [300, 400, 500, 600, 700];
      return allowed.includes(n) ? n : 400;
    })();

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
            <h4 class="text-sm font-semibold text-gray-200">Layout</h4>
            <p class="text-xs text-gray-500 mt-1">Non-color design tokens like corner radius.</p>
          </div>

          <div class="md:col-span-2 rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-radiusMd" class="block text-xs font-medium text-gray-200 mb-1">Corner Radius (Medium)</label>
            <p class="text-xs text-gray-500 mb-2">Controls rounded corners across cards/buttons (drives sm/lg/xl too).</p>
            <div class="flex flex-col md:flex-row gap-3 md:items-center">
              <input type="range" id="custom-radiusMd" min="0" max="24" step="1" value="${Math.max(0, Math.min(24, radiusMdDefaultPx))}"
                class="w-full md:flex-1" />
              <div class="flex items-center gap-2">
                <input type="number" id="custom-radiusMd-number" min="0" max="24" step="1" value="${Math.max(0, Math.min(24, radiusMdDefaultPx))}"
                  class="w-20 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" />
                <span class="text-xs text-gray-400">px</span>
              </div>
              <div class="hidden md:block w-16 h-10 border border-gray-700/70 bg-gray-800/40" id="custom-radiusMd-preview"></div>
            </div>
          </div>

          <div class="md:col-span-2 rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-shadowPreset" class="block text-xs font-medium text-gray-200 mb-1">Shadow Preset</label>
            <p class="text-xs text-gray-500 mb-2">Controls global elevation shadows for cards/panels.</p>
            <div class="flex flex-col md:flex-row gap-3 md:items-center">
              <select id="custom-shadowPreset" class="w-full md:w-64 p-2 rounded-lg bg-gray-800/70 border border-gray-700 text-xs">
                <option value="default" ${shadowPresetDefault === 'default' ? 'selected' : ''}>Default</option>
                <option value="none" ${shadowPresetDefault === 'none' ? 'selected' : ''}>None</option>
                <option value="soft" ${shadowPresetDefault === 'soft' ? 'selected' : ''}>Soft</option>
                <option value="crisp" ${shadowPresetDefault === 'crisp' ? 'selected' : ''}>Crisp</option>
                <option value="deep" ${shadowPresetDefault === 'deep' ? 'selected' : ''}>Deep</option>
              </select>
              <div class="flex-1"></div>
              <div class="hidden md:block w-16 h-10 border border-gray-700/70 bg-gray-800/40" id="custom-shadowPreset-preview"></div>
            </div>
          </div>

          <div class="md:col-span-2 rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-spacingScale" class="block text-xs font-medium text-gray-200 mb-1">Spacing Scale</label>
            <p class="text-xs text-gray-500 mb-2">Scales padding/margins/gaps (token spacing scale).</p>
            <div class="flex flex-col md:flex-row gap-3 md:items-center">
              <input type="range" id="custom-spacingScale" min="0.5" max="1.75" step="0.05" value="${spacingScaleDefault}"
                class="w-full md:flex-1" />
              <div class="flex items-center gap-2">
                <input type="number" id="custom-spacingScale-number" min="0.5" max="1.75" step="0.05" value="${spacingScaleDefault}"
                  class="w-24 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" />
                <span class="text-xs text-gray-400">×</span>
              </div>
              <div class="hidden md:flex items-center">
                <div class="w-40 border border-gray-700/70 bg-gray-800/40 rounded-lg p-2" id="custom-spacingScale-preview"></div>
              </div>
            </div>
          </div>

          <div class="md:col-span-2 rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-fontScale" class="block text-xs font-medium text-gray-200 mb-1">Font Scale</label>
            <p class="text-xs text-gray-500 mb-2">Scales overall text size (applied to body font-size).</p>
            <div class="flex flex-col md:flex-row gap-3 md:items-center">
              <input type="range" id="custom-fontScale" min="0.75" max="1.5" step="0.05" value="${Math.max(0.75, Math.min(1.5, fontScaleDefault))}"
                class="w-full md:flex-1" />
              <div class="flex items-center gap-2">
                <input type="number" id="custom-fontScale-number" min="0.75" max="1.5" step="0.05" value="${Math.max(0.75, Math.min(1.5, fontScaleDefault))}"
                  class="w-24 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" />
                <span class="text-xs text-gray-400">×</span>
              </div>
              <div class="hidden md:flex items-center">
                <div class="w-40 border border-gray-700/70 bg-gray-800/40 rounded-lg p-2" id="custom-typography-preview"></div>
              </div>
            </div>
          </div>

          <div class="md:col-span-2 rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-baseFontWeight" class="block text-xs font-medium text-gray-200 mb-1">Base Font Weight</label>
            <p class="text-xs text-gray-500 mb-2">Sets the normal/medium/semibold/bold weight scale.</p>
            <div class="flex flex-col md:flex-row gap-3 md:items-center">
              <select id="custom-baseFontWeight" class="w-full md:w-64 p-2 rounded-lg bg-gray-800/70 border border-gray-700 text-xs">
                <option value="300" ${baseFontWeightDefault === 300 ? 'selected' : ''}>Light (300)</option>
                <option value="400" ${baseFontWeightDefault === 400 ? 'selected' : ''}>Normal (400)</option>
                <option value="500" ${baseFontWeightDefault === 500 ? 'selected' : ''}>Medium (500)</option>
                <option value="600" ${baseFontWeightDefault === 600 ? 'selected' : ''}>Semibold (600)</option>
                <option value="700" ${baseFontWeightDefault === 700 ? 'selected' : ''}>Bold (700)</option>
              </select>
            </div>
          </div>

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
            <label for="custom-bgTertiary" class="block text-xs font-medium text-gray-200 mb-1">Background (Tertiary)</label>
            <p class="text-xs text-gray-500 mb-2">Tertiary surface background token.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-bgTertiary" value="${bgTertiaryDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-bgTertiary-text" value="${bgTertiaryDefault}" 
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

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-textOnPrimary" class="block text-xs font-medium text-gray-200 mb-1">Text on Primary</label>
            <p class="text-xs text-gray-500 mb-2">Text used on primary-colored surfaces.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-textOnPrimary" value="${textOnPrimaryDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-textOnPrimary-text" value="${textOnPrimaryDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-textOnSecondary" class="block text-xs font-medium text-gray-200 mb-1">Text on Secondary</label>
            <p class="text-xs text-gray-500 mb-2">Text used on secondary-colored surfaces.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-textOnSecondary" value="${textOnSecondaryDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-textOnSecondary-text" value="${textOnSecondaryDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-textOnAccent" class="block text-xs font-medium text-gray-200 mb-1">Text on Accent</label>
            <p class="text-xs text-gray-500 mb-2">Text used on accent-colored surfaces.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-textOnAccent" value="${textOnAccentDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-textOnAccent-text" value="${textOnAccentDefault}" 
                class="flex-1 p-2 rounded-lg bg-gray-800/70 border border-gray-700 font-mono text-xs" 
                pattern="^#[0-9A-Fa-f]{6}$" />
            </div>
          </div>

          <div class="rounded-xl border border-gray-700/60 bg-gray-900/30 p-3">
            <label for="custom-textOnDanger" class="block text-xs font-medium text-gray-200 mb-1">Text on Danger</label>
            <p class="text-xs text-gray-500 mb-2">Text used on danger-colored surfaces.</p>
            <div class="flex gap-3 items-center">
              <input type="color" id="custom-textOnDanger" value="${textOnDangerDefault}" 
                class="w-12 h-12 rounded-lg border-2 border-gray-700 cursor-pointer" />
              <input type="text" id="custom-textOnDanger-text" value="${textOnDangerDefault}" 
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
    ['primary', 'secondary', 'accent', 'navBg', 'navText', 'bgPrimary', 'bgSecondary', 'bgTertiary', 'bgElevated', 'borderDefault', 'borderHover', 'borderFocus', 'textPrimary', 'textSecondary', 'textMuted', 'textOnPrimary', 'textOnSecondary', 'textOnAccent', 'textOnDanger', 'warning', 'info', 'buttonPrimary', 'buttonSecondary', 'buttonDanger', 'buttonSuccess'].forEach(colorType => {
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
      const radiusMd = (() => {
        const el = document.getElementById('custom-radiusMd-number');
        const n = el ? parseInt(el.value, 10) : NaN;
        if (!Number.isFinite(n)) {
          return null;
        }
        return `${Math.max(0, Math.min(32, n))}px`;
      })();

      const shadowPreset = (() => {
        const el = document.getElementById('custom-shadowPreset');
        const v = el ? String(el.value || '').trim() : '';
        return v || 'default';
      })();

      const spacingScale = (() => {
        const el = document.getElementById('custom-spacingScale-number');
        const n = el ? parseFloat(String(el.value || '').trim()) : NaN;
        if (!Number.isFinite(n)) {
          return null;
        }
        return Math.max(0.5, Math.min(1.75, n));
      })();

      const fontScale = (() => {
        const el = document.getElementById('custom-fontScale-number');
        const n = el ? parseFloat(String(el.value || '').trim()) : NaN;
        if (!Number.isFinite(n)) {
          return null;
        }
        return Math.max(0.75, Math.min(1.5, n));
      })();

      const baseFontWeight = (() => {
        const el = document.getElementById('custom-baseFontWeight');
        const n = el ? parseInt(String(el.value || '').trim(), 10) : NaN;
        if (!Number.isFinite(n)) {
          return null;
        }
        const allowed = [300, 400, 500, 600, 700];
        return allowed.includes(n) ? n : null;
      })();

      const colors = {
        primary: document.getElementById('custom-primary').value,
        secondary: document.getElementById('custom-secondary').value,
        accent: document.getElementById('custom-accent').value,
        navBg: document.getElementById('custom-navBg').value,
        navText: document.getElementById('custom-navText').value,
        bgPrimary: document.getElementById('custom-bgPrimary').value,
        bgSecondary: document.getElementById('custom-bgSecondary').value,
        bgTertiary: document.getElementById('custom-bgTertiary').value,
        bgElevated: document.getElementById('custom-bgElevated').value,
        borderDefault: document.getElementById('custom-borderDefault').value,
        borderHover: document.getElementById('custom-borderHover').value,
        borderFocus: document.getElementById('custom-borderFocus').value,
        textPrimary: document.getElementById('custom-textPrimary').value,
        textSecondary: document.getElementById('custom-textSecondary').value,
        textMuted: document.getElementById('custom-textMuted').value,
        textOnPrimary: document.getElementById('custom-textOnPrimary').value,
        textOnSecondary: document.getElementById('custom-textOnSecondary').value,
        textOnAccent: document.getElementById('custom-textOnAccent').value,
        textOnDanger: document.getElementById('custom-textOnDanger').value,
        warning: document.getElementById('custom-warning').value,
        info: document.getElementById('custom-info').value,
        buttonPrimary: document.getElementById('custom-buttonPrimary').value,
        buttonSecondary: document.getElementById('custom-buttonSecondary').value,
        buttonDanger: document.getElementById('custom-buttonDanger').value,
        buttonSuccess: document.getElementById('custom-buttonSuccess').value,

        radiusMd,
        shadowPreset,
        spacingScale,
        fontScale,
        baseFontWeight
      };

      window.ThemeEnhanced.customBuilder.updateColors(colors);
      window.ThemeEnhanced.customBuilder.apply();

      if (window.A11y) {
        window.A11y.announce('Custom theme applied');
      }
    });

    // Radius control sync + preview
    const radiusRange = document.getElementById('custom-radiusMd');
    const radiusNumber = document.getElementById('custom-radiusMd-number');
    const radiusPreview = document.getElementById('custom-radiusMd-preview');
    const updateRadiusPreview = (px) => {
      if (!radiusPreview) {
        return;
      }
      const n = Math.max(0, Math.min(24, parseInt(px, 10) || 0));
      radiusPreview.style.borderRadius = `${n}px`;
    };
    if (radiusRange && radiusNumber) {
      updateRadiusPreview(radiusNumber.value);
      radiusRange.addEventListener('input', e => {
        radiusNumber.value = e.target.value;
        updateRadiusPreview(e.target.value);
      });
      radiusNumber.addEventListener('input', e => {
        const n = Math.max(0, Math.min(24, parseInt(e.target.value, 10) || 0));
        radiusRange.value = String(n);
        updateRadiusPreview(n);
      });
    }

    // Shadow preset preview
    const shadowSelect = document.getElementById('custom-shadowPreset');
    const shadowPreview = document.getElementById('custom-shadowPreset-preview');
    const updateShadowPreview = () => {
      if (!shadowPreview || !shadowSelect) {
        return;
      }
      const id = String(shadowSelect.value || '').trim();
      const map = {
        default: 'var(--token-shadow-md)',
        none: 'none',
        soft: '0 3px 8px rgba(0, 0, 0, 0.06)',
        crisp: '0 4px 10px rgba(0, 0, 0, 0.12)',
        deep: '0 8px 16px rgba(0, 0, 0, 0.18)'
      };
      shadowPreview.style.boxShadow = map[id] || map.default;
      shadowPreview.style.borderRadius = 'var(--token-radius-md)';
    };
    if (shadowSelect) {
      updateShadowPreview();
      shadowSelect.addEventListener('change', updateShadowPreview);
    }

    // Spacing scale sync
    const spacingRange = document.getElementById('custom-spacingScale');
    const spacingNumber = document.getElementById('custom-spacingScale-number');
    const spacingPreview = document.getElementById('custom-spacingScale-preview');
    const updateSpacingPreview = () => {
      if (!spacingPreview) {
        return;
      }
      const n = spacingNumber ? parseFloat(String(spacingNumber.value || '').trim()) : NaN;
      const scale = Number.isFinite(n) ? Math.max(0.5, Math.min(1.75, n)) : 1;
      const gap = Math.round(8 * scale);
      const pad = Math.round(8 * scale);

      spacingPreview.innerHTML = `
        <div class="flex items-center" style="gap:${gap}px; padding:${pad}px;">
          <div class="w-3 h-3 bg-gray-300/80 rounded"></div>
          <div class="w-3 h-3 bg-gray-300/80 rounded"></div>
          <div class="w-3 h-3 bg-gray-300/80 rounded"></div>
        </div>
      `;
    };
    if (spacingRange && spacingNumber) {
      updateSpacingPreview();
      spacingRange.addEventListener('input', e => {
        spacingNumber.value = e.target.value;
        updateSpacingPreview();
      });
      spacingNumber.addEventListener('input', e => {
        const n = parseFloat(String(e.target.value || '').trim());
        if (Number.isFinite(n)) {
          spacingRange.value = String(Math.max(0.5, Math.min(1.75, n)));
        }
        updateSpacingPreview();
      });
    }

    // Font scale sync
    const fontRange = document.getElementById('custom-fontScale');
    const fontNumber = document.getElementById('custom-fontScale-number');
    const weightSelect = document.getElementById('custom-baseFontWeight');
    const typographyPreview = document.getElementById('custom-typography-preview');
    const updateTypographyPreview = () => {
      if (!typographyPreview) {
        return;
      }
      const s = fontNumber ? parseFloat(String(fontNumber.value || '').trim()) : NaN;
      const scale = Number.isFinite(s) ? Math.max(0.75, Math.min(1.5, s)) : 1;
      const w = weightSelect ? parseInt(String(weightSelect.value || '').trim(), 10) : 400;
      const weight = Number.isFinite(w) ? w : 400;

      typographyPreview.innerHTML = `
        <div style="font-size:${scale}em; font-weight:${weight}; line-height:1.2;">
          Aa
        </div>
        <div class="text-[10px] text-gray-400 mt-1">
          ${scale.toFixed(2)}× / ${weight}
        </div>
      `;
    };
    if (fontRange && fontNumber) {
      updateTypographyPreview();
      fontRange.addEventListener('input', e => {
        fontNumber.value = e.target.value;
        updateTypographyPreview();
      });
      fontNumber.addEventListener('input', e => {
        const n = parseFloat(String(e.target.value || '').trim());
        if (Number.isFinite(n)) {
          fontRange.value = String(Math.max(0.75, Math.min(1.5, n)));
        }
        updateTypographyPreview();
      });
    }
    if (weightSelect) {
      updateTypographyPreview();
      weightSelect.addEventListener('change', updateTypographyPreview);
    }

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
