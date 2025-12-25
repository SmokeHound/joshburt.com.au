// Updated unit tests for theme persistence and CSS variable application (legacy toggle removed)
const { loadHTMLFile } = require('../utils/dom-helpers');

describe('Theme System (Preset / Persistence)', () => {
  let themeHTML;

  beforeAll(() => {
    themeHTML = loadHTMLFile('shared-theme.html');
  });

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = themeHTML;
    document.body.className = '';
    // Execute the script to initialize ThemeManager
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.textContent) {
        eval(script.textContent);
      }
    });
  });

  test('defaults to dark when no settings present', () => {
    expect(window.Theme).toBeDefined();
    const result = window.Theme.applyFromStorage();
    expect(result.id).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('applies stored light theme from siteSettings', () => {
    localStorage.setItem('siteSettings', JSON.stringify({ theme: 'light' }));
    const result = window.Theme.applyFromStorage();
    expect(result.id).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('applies custom color variables from siteSettings', () => {
    localStorage.setItem(
      'siteSettings',
      JSON.stringify({
        primaryColor: '#123456',
        secondaryColor: '#abcdef',
        accentColor: '#ff00aa',
        theme: 'dark'
      })
    );
    window.Theme.applyFromStorage();
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--tw-color-primary').trim()
    ).toBe('#123456');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--tw-color-secondary').trim()
    ).toBe('#abcdef');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--tw-color-accent').trim()
    ).toBe('#ff00aa');

    // Token variables (used by ui-* primitives)
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--token-color-primary').trim()
    ).toBe('#123456');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--token-color-secondary').trim()
    ).toBe('#abcdef');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--token-color-accent').trim()
    ).toBe('#ff00aa');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('ignores legacy theme-toggle expectations', () => {
    expect(document.getElementById('theme-toggle')).toBeFalsy();
  });

  test('supports system theme detection', () => {
    localStorage.setItem('siteSettings', JSON.stringify({ theme: 'system' }));
    const result = window.Theme.applyFromStorage();
    expect(result.id).toBe('system');
    expect(['dark', 'light']).toContain(result.resolvedId);
  });

  test('supports neon theme preset', () => {
    const result = window.Theme.setTheme('neon', false);
    expect(result.id).toBe('neon');
    expect(result.mode).toBe('dark');
    expect(result.colors.primary).toBe('#00d4ff');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('supports ocean theme preset', () => {
    const result = window.Theme.setTheme('ocean', false);
    expect(result.id).toBe('ocean');
    expect(result.mode).toBe('dark');
    expect(result.colors.primary).toBe('#0284c7');
  });

  test('supports high-contrast theme preset', () => {
    const result = window.Theme.setTheme('high-contrast', false);
    expect(result.id).toBe('high-contrast');
    expect(result.mode).toBe('dark');
    expect(result.colors.primary).toBe('#00ffff');
  });

  test('exposes getActiveTheme API', () => {
    localStorage.setItem('siteSettings', JSON.stringify({ theme: 'neon' }));
    window.Theme.applyFromStorage();
    const active = window.Theme.getActiveTheme();
    expect(active.id).toBe('neon');
    expect(active.mode).toBe('dark');
    expect(active.colors.primary).toBe('#00d4ff');
  });

  test('exposes getPresets API', () => {
    const presets = window.Theme.getPresets();
    expect(presets).toContain('dark');
    expect(presets).toContain('light');
    expect(presets).toContain('neon');
    expect(presets).toContain('ocean');
    expect(presets).toContain('high-contrast');
    // 'system' is not a preset but a special theme ID that resolves dynamically
    expect(presets).not.toContain('system');
  });

  test('setPalette applies custom colors', () => {
    const customColors = {
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff'
    };
    window.Theme.setPalette(customColors, false);
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--tw-color-primary').trim()
    ).toBe('#ff0000');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--tw-color-secondary').trim()
    ).toBe('#00ff00');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--tw-color-accent').trim()
    ).toBe('#0000ff');
  });
});
