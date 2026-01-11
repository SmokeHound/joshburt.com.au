// Centralized ThemeManager - handles theme application, persistence, and multi-theme support
(function() {
  'use strict';

  // Theme presets with color palettes and dark/light designation
  const THEME_PRESETS = {
    dark: {
      mode: 'dark',
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        accent: '#8b5cf6',
        buttonPrimary: '#3b82f6',
        buttonSecondary: '#6b7280',
        buttonDanger: '#ef4444',
        buttonSuccess: '#10b981'
      }
    },
    light: {
      mode: 'light',
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        accent: '#8b5cf6',
        buttonPrimary: '#3b82f6',
        buttonSecondary: '#6b7280',
        buttonDanger: '#ef4444',
        buttonSuccess: '#10b981'
      }
    },
    'high-contrast': {
      mode: 'dark',
      colors: {
        primary: '#00ffff',
        secondary: '#00ff00',
        accent: '#ff00ff',
        buttonPrimary: '#00ffff',
        buttonSecondary: '#ffffff',
        buttonDanger: '#ff0000',
        buttonSuccess: '#00ff00'
      }
    },
    neon: {
      mode: 'dark',
      colors: {
        primary: '#00d4ff',
        secondary: '#00ff88',
        accent: '#ff00aa',
        buttonPrimary: '#00d4ff',
        buttonSecondary: '#a78bfa',
        buttonDanger: '#ff0055',
        buttonSuccess: '#00ff88'
      }
    },
    ocean: {
      mode: 'dark',
      colors: {
        primary: '#0284c7',
        secondary: '#06b6d4',
        accent: '#0ea5e9',
        buttonPrimary: '#0284c7',
        buttonSecondary: '#475569',
        buttonDanger: '#dc2626',
        buttonSuccess: '#06b6d4'
      }
    },
    forest: {
      mode: 'dark',
      colors: {
        primary: '#166534',
        secondary: '#22c55e',
        accent: '#84cc16',
        buttonPrimary: '#16a34a',
        buttonSecondary: '#65a30d',
        buttonDanger: '#dc2626',
        buttonSuccess: '#22c55e'
      }
    },
    sunset: {
      mode: 'light',
      colors: {
        primary: '#f59e42',
        secondary: '#ef4444',
        accent: '#f472b6',
        buttonPrimary: '#f59e0b',
        buttonSecondary: '#f97316',
        buttonDanger: '#ef4444',
        buttonSuccess: '#84cc16'
      }
    },
    mono: {
      mode: 'dark',
      colors: {
        primary: '#22223b',
        secondary: '#4a4e69',
        accent: '#9a8c98',
        buttonPrimary: '#4a4e69',
        buttonSecondary: '#6b7280',
        buttonDanger: '#991b1b',
        buttonSuccess: '#065f46'
      }
    }
    ,
    cyberpunk: {
      mode: 'dark',
      colors: {
        primary: '#ff0181',
        secondary: '#00f5d4',
        accent: '#7c3aed',
        buttonPrimary: '#ff0181',
        buttonSecondary: '#7c3aed',
        buttonDanger: '#ff4d4d',
        buttonSuccess: '#00f5d4'
      }
    },
    pastel: {
      mode: 'light',
      colors: {
        primary: '#ffd6e0',
        secondary: '#cdeffd',
        accent: '#e6e6fa',
        buttonPrimary: '#ffd6e0',
        buttonSecondary: '#cdeffd',
        buttonDanger: '#ff9b9b',
        buttonSuccess: '#b7f0a4'
      }
    },
    solar: {
      mode: 'light',
      colors: {
        primary: '#f59e0b',
        secondary: '#f97316',
        accent: '#fde68a',
        buttonPrimary: '#f59e0b',
        buttonSecondary: '#f97316',
        buttonDanger: '#ef4444',
        buttonSuccess: '#65a30d'
      }
    },
    midnight: {
      mode: 'dark',
      colors: {
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#475569',
        buttonPrimary: '#0f172a',
        buttonSecondary: '#334155',
        buttonDanger: '#ef4444',
        buttonSuccess: '#10b981'
      }
    },
    sakura: {
      mode: 'light',
      colors: {
        primary: '#ec4899',
        secondary: '#f472b6',
        accent: '#fce7f3',
        buttonPrimary: '#ec4899',
        buttonSecondary: '#f9a8d4',
        buttonDanger: '#f43f5e',
        buttonSuccess: '#10b981'
      }
    }
  };

  const DEFAULT_THEME = 'dark';

  // Get system preference
  function getSystemTheme() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Get stored theme from localStorage (backward compatible)
  function getStoredTheme() {
    try {
      // Check siteSettings.theme first (new format)
      const siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
      if (siteSettings.theme) {
        return siteSettings.theme;
      }

      // Fallback to legacy localStorage('theme')
      const legacyTheme = localStorage.getItem('theme');
      if (legacyTheme) {
        return legacyTheme;
      }
    } catch (e) {
      // Ignore parse errors
    }
    return null;
  }

  // Get stored custom colors from localStorage (backward compatible)
  function getStoredColors() {
    try {
      const siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
      return {
        primary: siteSettings.primaryColor || localStorage.getItem('primaryColor') || null,
        secondary: siteSettings.secondaryColor || localStorage.getItem('secondaryColor') || null,
        accent: siteSettings.accentColor || localStorage.getItem('accentColor') || null,
        navBg: siteSettings.navBgColor || localStorage.getItem('navBgColor') || null,
        navText: siteSettings.navTextColor || localStorage.getItem('navTextColor') || null,
        buttonPrimary: siteSettings.buttonPrimaryColor || localStorage.getItem('buttonPrimaryColor') || null,
        buttonSecondary: siteSettings.buttonSecondaryColor || localStorage.getItem('buttonSecondaryColor') || null,
        buttonDanger: siteSettings.buttonDangerColor || localStorage.getItem('buttonDangerColor') || null,
        buttonSuccess: siteSettings.buttonSuccessColor || localStorage.getItem('buttonSuccessColor') || null,
        bgPrimary: siteSettings.bgPrimaryColor || localStorage.getItem('bgPrimaryColor') || null,
        bgSecondary: siteSettings.bgSecondaryColor || localStorage.getItem('bgSecondaryColor') || null,
        bgTertiary: siteSettings.bgTertiaryColor || localStorage.getItem('bgTertiaryColor') || null,
        bgElevated: siteSettings.bgElevatedColor || localStorage.getItem('bgElevatedColor') || null,
        borderDefault: siteSettings.borderDefaultColor || localStorage.getItem('borderDefaultColor') || null,
        borderHover: siteSettings.borderHoverColor || localStorage.getItem('borderHoverColor') || null,
        borderFocus: siteSettings.borderFocusColor || localStorage.getItem('borderFocusColor') || null,
        textPrimary: siteSettings.textPrimaryColor || localStorage.getItem('textPrimaryColor') || null,
        textSecondary: siteSettings.textSecondaryColor || localStorage.getItem('textSecondaryColor') || null,
        textMuted: siteSettings.textMutedColor || localStorage.getItem('textMutedColor') || null,
        textOnPrimary: siteSettings.textOnPrimaryColor || localStorage.getItem('textOnPrimaryColor') || null,
        textOnSecondary: siteSettings.textOnSecondaryColor || localStorage.getItem('textOnSecondaryColor') || null,
        textOnAccent: siteSettings.textOnAccentColor || localStorage.getItem('textOnAccentColor') || null,
        textOnDanger: siteSettings.textOnDangerColor || localStorage.getItem('textOnDangerColor') || null,
        warning: siteSettings.warningColor || localStorage.getItem('warningColor') || null,
        info: siteSettings.infoColor || localStorage.getItem('infoColor') || null,

        // Non-color tokens
        radiusMd: siteSettings.radiusMd || localStorage.getItem('radiusMd') || null
      };
    } catch (e) {
      return { primary: null, secondary: null, accent: null, navBg: null, navText: null, buttonPrimary: null, buttonSecondary: null, buttonDanger: null, buttonSuccess: null, bgPrimary: null, bgSecondary: null, bgTertiary: null, bgElevated: null, borderDefault: null, borderHover: null, borderFocus: null, textPrimary: null, textSecondary: null, textMuted: null, textOnPrimary: null, textOnSecondary: null, textOnAccent: null, textOnDanger: null, warning: null, info: null, radiusMd: null };
    }
  }

  // Resolve theme ID to actual theme (handles 'system' special case)
  function resolveThemeId(themeId) {
    if (themeId === 'system') {
      return getSystemTheme();
    }
    return themeId || DEFAULT_THEME;
  }

  // Apply CSS variables to documentElement
  function applyCSSVariables(colors) {
    const root = document.documentElement;
    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
    const hexToRgb = hex => {
      if (!hex) {
        return null;
      }
      const raw = String(hex).trim().replace('#', '');
      const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
      if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        return null;
      }
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return { r, g, b };
    };
    const setAlphaVars = (baseName, hex) => {
      const rgb = hexToRgb(hex);
      if (!rgb) {
        return;
      }
      const alphas = [10, 20, 30, 40, 60];
      alphas.forEach(a => {
        const alpha = clamp(a / 100, 0, 1);
        root.style.setProperty(
          `${baseName}-alpha-${a}`,
          `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
        );
      });
    };

    if (colors.primary) {
      root.style.setProperty('--tw-color-primary', colors.primary);
    }
    if (colors.secondary) {
      root.style.setProperty('--tw-color-secondary', colors.secondary);
    }
    if (colors.accent) {
      root.style.setProperty('--tw-color-accent', colors.accent);
    }
    if (colors.buttonPrimary) {
      root.style.setProperty('--btn-primary-bg', colors.buttonPrimary);
    }
    if (colors.buttonSecondary) {
      root.style.setProperty('--btn-secondary-bg', colors.buttonSecondary);
    }
    if (colors.buttonDanger) {
      root.style.setProperty('--btn-danger-bg', colors.buttonDanger);
    }
    if (colors.buttonSuccess) {
      root.style.setProperty('--btn-success-bg', colors.buttonSuccess);
    }

    // Token-driven UI primitives (ui-btn, ui-card, ui-link)
    if (colors.primary) {
      root.style.setProperty('--token-color-primary', colors.primary);
      root.style.setProperty('--token-color-primary-hover', colors.primary);
      root.style.setProperty('--token-color-primary-active', colors.primary);
      setAlphaVars('--token-color-primary', colors.primary);
    }
    if (colors.secondary) {
      root.style.setProperty('--token-color-secondary', colors.secondary);
      root.style.setProperty('--token-color-secondary-hover', colors.secondary);
      root.style.setProperty('--token-color-secondary-active', colors.secondary);
      setAlphaVars('--token-color-secondary', colors.secondary);
    }
    if (colors.accent) {
      root.style.setProperty('--token-color-accent', colors.accent);
      root.style.setProperty('--token-color-accent-hover', colors.accent);
      root.style.setProperty('--token-color-accent-active', colors.accent);
      setAlphaVars('--token-color-accent', colors.accent);
    }
    // Map button colors to semantic tokens so ui-btn-danger/ui-btn-secondary can follow settings.
    if (colors.buttonDanger) {
      root.style.setProperty('--token-color-danger', colors.buttonDanger);
      root.style.setProperty('--token-color-danger-hover', colors.buttonDanger);
      root.style.setProperty('--token-color-danger-active', colors.buttonDanger);
      setAlphaVars('--token-color-danger', colors.buttonDanger);
    }
    if (colors.buttonSuccess) {
      root.style.setProperty('--token-color-success', colors.buttonSuccess);
      root.style.setProperty('--token-color-success-hover', colors.buttonSuccess);
      root.style.setProperty('--token-color-success-active', colors.buttonSuccess);
    }

    // Nav customization
    if (colors.navText) {
      root.style.setProperty('--token-nav-text', colors.navText);
    } else {
      root.style.removeProperty('--token-nav-text');
    }

    if (colors.navBg) {
      root.style.setProperty('--token-nav-bg', colors.navBg);
    } else if (colors.primary) {
      // Default: sidebar/nav background tint follows active theme primary
      // Uses precomputed alpha tokens so it updates consistently across themes.
      root.style.setProperty('--token-nav-bg', 'var(--token-color-primary-alpha-40)');
    } else {
      root.style.removeProperty('--token-nav-bg');
    }

    // Surface + text customization
    if (colors.bgPrimary) {
      root.style.setProperty('--token-bg-primary', colors.bgPrimary);
    } else {
      root.style.removeProperty('--token-bg-primary');
    }
    if (colors.bgSecondary) {
      root.style.setProperty('--token-bg-secondary', colors.bgSecondary);
    } else {
      root.style.removeProperty('--token-bg-secondary');
    }
    if (colors.bgTertiary) {
      root.style.setProperty('--token-bg-tertiary', colors.bgTertiary);
    } else {
      root.style.removeProperty('--token-bg-tertiary');
    }
    if (colors.bgElevated) {
      root.style.setProperty('--token-bg-elevated', colors.bgElevated);
    } else {
      root.style.removeProperty('--token-bg-elevated');
    }

    if (colors.borderDefault) {
      root.style.setProperty('--token-border-default', colors.borderDefault);
    } else {
      root.style.removeProperty('--token-border-default');
    }
    if (colors.borderHover) {
      root.style.setProperty('--token-border-hover', colors.borderHover);
    } else {
      root.style.removeProperty('--token-border-hover');
    }
    if (colors.borderFocus) {
      root.style.setProperty('--token-border-focus', colors.borderFocus);
    } else {
      root.style.removeProperty('--token-border-focus');
    }
    if (colors.textPrimary) {
      root.style.setProperty('--token-text-primary', colors.textPrimary);
    } else {
      root.style.removeProperty('--token-text-primary');
    }
    if (colors.textSecondary) {
      root.style.setProperty('--token-text-secondary', colors.textSecondary);
    } else {
      root.style.removeProperty('--token-text-secondary');
    }
    if (colors.textMuted) {
      root.style.setProperty('--token-text-muted', colors.textMuted);
    } else {
      root.style.removeProperty('--token-text-muted');
    }

    if (colors.textOnPrimary) {
      root.style.setProperty('--token-text-on-primary', colors.textOnPrimary);
    } else {
      root.style.removeProperty('--token-text-on-primary');
    }
    if (colors.textOnSecondary) {
      root.style.setProperty('--token-text-on-secondary', colors.textOnSecondary);
    } else {
      root.style.removeProperty('--token-text-on-secondary');
    }
    if (colors.textOnAccent) {
      root.style.setProperty('--token-text-on-accent', colors.textOnAccent);
    } else {
      root.style.removeProperty('--token-text-on-accent');
    }
    if (colors.textOnDanger) {
      root.style.setProperty('--token-text-on-danger', colors.textOnDanger);
    } else {
      root.style.removeProperty('--token-text-on-danger');
    }

    // Status colors
    if (colors.warning) {
      root.style.setProperty('--token-color-warning', colors.warning);
      root.style.setProperty('--token-color-warning-hover', colors.warning);
      root.style.setProperty('--token-color-warning-active', colors.warning);
    } else {
      root.style.removeProperty('--token-color-warning');
      root.style.removeProperty('--token-color-warning-hover');
      root.style.removeProperty('--token-color-warning-active');
    }
    if (colors.info) {
      root.style.setProperty('--token-color-info', colors.info);
    } else {
      root.style.removeProperty('--token-color-info');
    }

    // Corner radius customization (single control drives the scale)
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

    const radiusMdPx = parseLengthToPx(colors.radiusMd);
    if (radiusMdPx !== null) {
      const md = Math.max(0, Math.min(32, radiusMdPx));
      const sm = Math.round(md * 0.5);
      const lg = Math.round(md * 1.5);
      const xl = Math.round(md * 2);
      root.style.setProperty('--token-radius-sm', `${sm}px`);
      root.style.setProperty('--token-radius-md', `${Math.round(md)}px`);
      root.style.setProperty('--token-radius-lg', `${lg}px`);
      root.style.setProperty('--token-radius-xl', `${xl}px`);
      // Keep full as-is (typically 9999px) unless you want a separate control.
    } else {
      root.style.removeProperty('--token-radius-sm');
      root.style.removeProperty('--token-radius-md');
      root.style.removeProperty('--token-radius-lg');
      root.style.removeProperty('--token-radius-xl');
    }
  }

  // Apply dark/light class to documentElement
  function applyModeClass(mode) {
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle('dark', mode === 'dark');
    root.classList.toggle('light', mode === 'light');
    if (body && body.classList) {
      body.classList.toggle('dark', mode === 'dark');
      body.classList.toggle('light', mode === 'light');
    }
  }

  // Apply a theme (by ID or preset)
  function applyTheme(themeId, customColors) {
    const resolvedId = resolveThemeId(themeId);
    const preset = THEME_PRESETS[resolvedId] || THEME_PRESETS[DEFAULT_THEME];

    // Determine colors: custom overrides preset
    const colors = {
      primary: (customColors && customColors.primary) || preset.colors.primary,
      secondary: (customColors && customColors.secondary) || preset.colors.secondary,
      accent: (customColors && customColors.accent) || preset.colors.accent,
      navBg: (customColors && customColors.navBg) || null,
      navText: (customColors && customColors.navText) || null,
      buttonPrimary: (customColors && customColors.buttonPrimary) || preset.colors.buttonPrimary,
      buttonSecondary: (customColors && customColors.buttonSecondary) || preset.colors.buttonSecondary,
      buttonDanger: (customColors && customColors.buttonDanger) || preset.colors.buttonDanger,
      buttonSuccess: (customColors && customColors.buttonSuccess) || preset.colors.buttonSuccess,
      bgPrimary: (customColors && customColors.bgPrimary) || null,
      bgSecondary: (customColors && customColors.bgSecondary) || null,
      bgTertiary: (customColors && customColors.bgTertiary) || null,
      bgElevated: (customColors && customColors.bgElevated) || null,
      borderDefault: (customColors && customColors.borderDefault) || null,
      borderHover: (customColors && customColors.borderHover) || null,
      borderFocus: (customColors && customColors.borderFocus) || null,
      textPrimary: (customColors && customColors.textPrimary) || null,
      textSecondary: (customColors && customColors.textSecondary) || null,
      textMuted: (customColors && customColors.textMuted) || null,
      textOnPrimary: (customColors && customColors.textOnPrimary) || null,
      textOnSecondary: (customColors && customColors.textOnSecondary) || null,
      textOnAccent: (customColors && customColors.textOnAccent) || null,
      textOnDanger: (customColors && customColors.textOnDanger) || null,
      warning: (customColors && customColors.warning) || null,
      info: (customColors && customColors.info) || null,

      // Non-color tokens
      radiusMd: (customColors && customColors.radiusMd) || null
    };

    applyCSSVariables(colors);
    applyModeClass(preset.mode);

    const result = { id: themeId, resolvedId, mode: preset.mode, colors };

    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('theme:changed', { detail: result }));
      }
    } catch (e) {
      // Ignore event dispatch errors
    }

    return result;
  }

  // Public API
  const ThemeManager = {
    // Apply theme from storage (called on page load)
    applyFromStorage: function() {
      const storedTheme = getStoredTheme() || DEFAULT_THEME;
      const storedColors = getStoredColors();

      // Only apply custom colors if at least one is set
            const hasCustomColors = storedColors.primary || storedColors.secondary || storedColors.accent ||
              storedColors.navBg || storedColors.navText ||
                  storedColors.buttonPrimary || storedColors.buttonSecondary ||
                  storedColors.buttonDanger || storedColors.buttonSuccess ||
              storedColors.bgPrimary || storedColors.bgSecondary || storedColors.bgTertiary || storedColors.bgElevated ||
                    storedColors.borderDefault || storedColors.borderHover || storedColors.borderFocus || storedColors.textPrimary || storedColors.textSecondary ||
              storedColors.textMuted || storedColors.textOnPrimary || storedColors.textOnSecondary || storedColors.textOnAccent || storedColors.textOnDanger || storedColors.warning || storedColors.info ||
              storedColors.radiusMd;
      const customColors = hasCustomColors ? storedColors : null;

      return applyTheme(storedTheme, customColors);
    },

    // Set theme by ID (optionally persist to localStorage)
    setTheme: function(themeId, persist) {
      const result = applyTheme(themeId, null);

      if (persist !== false) {
        try {
          const siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
          siteSettings.theme = themeId;
          localStorage.setItem('siteSettings', JSON.stringify(siteSettings));
          localStorage.setItem('theme', themeId); // Legacy compatibility
        } catch (e) {
          // Ignore storage errors
        }
      }

      return result;
    },

    // Set custom palette (optionally persist)
    setPalette: function(colors, persist) {
      const currentTheme = getStoredTheme() || DEFAULT_THEME;
      const result = applyTheme(currentTheme, colors);

      if (persist !== false) {
        try {
          const siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
          if (colors.primary) {
            siteSettings.primaryColor = colors.primary;
          }
          if (colors.secondary) {
            siteSettings.secondaryColor = colors.secondary;
          }
          if (colors.accent) {
            siteSettings.accentColor = colors.accent;
          }
          if (colors.navBg) {
            siteSettings.navBgColor = colors.navBg;
          }
          if (colors.navText) {
            siteSettings.navTextColor = colors.navText;
          }
          if (colors.buttonPrimary) {
            siteSettings.buttonPrimaryColor = colors.buttonPrimary;
          }
          if (colors.buttonSecondary) {
            siteSettings.buttonSecondaryColor = colors.buttonSecondary;
          }
          if (colors.buttonDanger) {
            siteSettings.buttonDangerColor = colors.buttonDanger;
          }
          if (colors.buttonSuccess) {
            siteSettings.buttonSuccessColor = colors.buttonSuccess;
          }
          if (colors.bgPrimary) {
            siteSettings.bgPrimaryColor = colors.bgPrimary;
          }
          if (colors.bgSecondary) {
            siteSettings.bgSecondaryColor = colors.bgSecondary;
          }
          if (colors.bgTertiary) {
            siteSettings.bgTertiaryColor = colors.bgTertiary;
          }
          if (colors.bgElevated) {
            siteSettings.bgElevatedColor = colors.bgElevated;
          }
          if (colors.borderDefault) {
            siteSettings.borderDefaultColor = colors.borderDefault;
          }
          if (colors.borderHover) {
            siteSettings.borderHoverColor = colors.borderHover;
          }
          if (colors.borderFocus) {
            siteSettings.borderFocusColor = colors.borderFocus;
          }
          if (colors.textPrimary) {
            siteSettings.textPrimaryColor = colors.textPrimary;
          }
          if (colors.textSecondary) {
            siteSettings.textSecondaryColor = colors.textSecondary;
          }
          if (colors.textMuted) {
            siteSettings.textMutedColor = colors.textMuted;
          }
          if (colors.textOnPrimary) {
            siteSettings.textOnPrimaryColor = colors.textOnPrimary;
          }
          if (colors.textOnSecondary) {
            siteSettings.textOnSecondaryColor = colors.textOnSecondary;
          }
          if (colors.textOnAccent) {
            siteSettings.textOnAccentColor = colors.textOnAccent;
          }
          if (colors.textOnDanger) {
            siteSettings.textOnDangerColor = colors.textOnDanger;
          }
          if (colors.warning) {
            siteSettings.warningColor = colors.warning;
          }
          if (colors.info) {
            siteSettings.infoColor = colors.info;
          }
          if (colors.radiusMd !== undefined && colors.radiusMd !== null) {
            siteSettings.radiusMd = colors.radiusMd;
          }
          localStorage.setItem('siteSettings', JSON.stringify(siteSettings));

          // Legacy compatibility
          if (colors.primary) {
            localStorage.setItem('primaryColor', colors.primary);
          }
          if (colors.secondary) {
            localStorage.setItem('secondaryColor', colors.secondary);
          }
          if (colors.accent) {
            localStorage.setItem('accentColor', colors.accent);
          }
          if (colors.navBg) {
            localStorage.setItem('navBgColor', colors.navBg);
          }
          if (colors.navText) {
            localStorage.setItem('navTextColor', colors.navText);
          }
          if (colors.buttonPrimary) {
            localStorage.setItem('buttonPrimaryColor', colors.buttonPrimary);
          }
          if (colors.buttonSecondary) {
            localStorage.setItem('buttonSecondaryColor', colors.buttonSecondary);
          }
          if (colors.buttonDanger) {
            localStorage.setItem('buttonDangerColor', colors.buttonDanger);
          }
          if (colors.buttonSuccess) {
            localStorage.setItem('buttonSuccessColor', colors.buttonSuccess);
          }
          if (colors.bgPrimary) {
            localStorage.setItem('bgPrimaryColor', colors.bgPrimary);
          }
          if (colors.bgSecondary) {
            localStorage.setItem('bgSecondaryColor', colors.bgSecondary);
          }
          if (colors.bgTertiary) {
            localStorage.setItem('bgTertiaryColor', colors.bgTertiary);
          }
          if (colors.bgElevated) {
            localStorage.setItem('bgElevatedColor', colors.bgElevated);
          }
          if (colors.borderDefault) {
            localStorage.setItem('borderDefaultColor', colors.borderDefault);
          }
          if (colors.borderHover) {
            localStorage.setItem('borderHoverColor', colors.borderHover);
          }
          if (colors.borderFocus) {
            localStorage.setItem('borderFocusColor', colors.borderFocus);
          }
          if (colors.textPrimary) {
            localStorage.setItem('textPrimaryColor', colors.textPrimary);
          }
          if (colors.textSecondary) {
            localStorage.setItem('textSecondaryColor', colors.textSecondary);
          }
          if (colors.textMuted) {
            localStorage.setItem('textMutedColor', colors.textMuted);
          }
          if (colors.textOnPrimary) {
            localStorage.setItem('textOnPrimaryColor', colors.textOnPrimary);
          }
          if (colors.textOnSecondary) {
            localStorage.setItem('textOnSecondaryColor', colors.textOnSecondary);
          }
          if (colors.textOnAccent) {
            localStorage.setItem('textOnAccentColor', colors.textOnAccent);
          }
          if (colors.textOnDanger) {
            localStorage.setItem('textOnDangerColor', colors.textOnDanger);
          }
          if (colors.warning) {
            localStorage.setItem('warningColor', colors.warning);
          }
          if (colors.info) {
            localStorage.setItem('infoColor', colors.info);
          }
          if (colors.radiusMd !== undefined && colors.radiusMd !== null) {
            localStorage.setItem('radiusMd', String(colors.radiusMd));
          }
        } catch (e) {
          // Ignore storage errors
        }
      }

      return result;
    },

    // Get active theme info
    getActiveTheme: function() {
      const storedTheme = getStoredTheme() || DEFAULT_THEME;
      const storedColors = getStoredColors();
      const resolvedId = resolveThemeId(storedTheme);
      const preset = THEME_PRESETS[resolvedId] || THEME_PRESETS[DEFAULT_THEME];

      return {
        id: storedTheme,
        resolvedId: resolvedId,
        mode: preset.mode,
        colors: {
          primary: storedColors.primary || preset.colors.primary,
          secondary: storedColors.secondary || preset.colors.secondary,
          accent: storedColors.accent || preset.colors.accent,
          navBg: storedColors.navBg || null,
          navText: storedColors.navText || null,
          buttonPrimary: storedColors.buttonPrimary || preset.colors.buttonPrimary,
          buttonSecondary: storedColors.buttonSecondary || preset.colors.buttonSecondary,
          buttonDanger: storedColors.buttonDanger || preset.colors.buttonDanger,
          buttonSuccess: storedColors.buttonSuccess || preset.colors.buttonSuccess,
          bgPrimary: storedColors.bgPrimary || null,
          bgSecondary: storedColors.bgSecondary || null,
          bgTertiary: storedColors.bgTertiary || null,
          bgElevated: storedColors.bgElevated || null,
          borderDefault: storedColors.borderDefault || null,
          borderHover: storedColors.borderHover || null,
          borderFocus: storedColors.borderFocus || null,
          textPrimary: storedColors.textPrimary || null,
          textSecondary: storedColors.textSecondary || null,
          textMuted: storedColors.textMuted || null,
          textOnPrimary: storedColors.textOnPrimary || null,
          textOnSecondary: storedColors.textOnSecondary || null,
          textOnAccent: storedColors.textOnAccent || null,
          textOnDanger: storedColors.textOnDanger || null,
          warning: storedColors.warning || null,
          info: storedColors.info || null,

          // Non-color tokens
          radiusMd: storedColors.radiusMd || null
        }
      };
    },

    // Get available theme presets
    getPresets: function() {
      return Object.keys(THEME_PRESETS);
    }
  };

  // Listen for system theme changes (only if theme is set to 'system')
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = function() {
      const currentTheme = getStoredTheme();
      if (currentTheme === 'system') {
        ThemeManager.applyFromStorage();
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      // Legacy browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  // Listen for siteSettingsUpdated custom event (dispatched by settings.html)
  if (typeof window !== 'undefined') {
    window.addEventListener('siteSettingsUpdated', function() {
      ThemeManager.applyFromStorage();
    });

    // Listen for storage events (cross-tab synchronization)
    window.addEventListener('storage', function(e) {
      if (e.key === 'siteSettings' || e.key === 'theme') {
        ThemeManager.applyFromStorage();
      }
    });
  }

  // Expose API on window
  if (typeof window !== 'undefined') {
    window.Theme = ThemeManager;
  }

  // Apply theme immediately on load
  ThemeManager.applyFromStorage();
})();
