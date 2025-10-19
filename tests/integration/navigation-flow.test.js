/**
 * Integration tests for navigation and shared components.
 * Uses DOM parsing instead of brittle string-only assertions where possible.
 */
const { loadHTMLFile } = require('../utils/dom-helpers');

describe('Navigation & Shared Components Integration', () => {
  test('should contain expected navigation links', () => {
    const navHTML = loadHTMLFile('shared-nav.html');
    document.body.innerHTML = navHTML;

    const expectedLinks = [
      'index.html',
      'administration.html',
      'analytics.html',
      'settings.html',
      'oil.html',
      'consumables.html'
    ];

    expectedLinks.forEach(href => {
      const el = document.querySelector(`a[href="${href}"]`);
      expect(el).toBeTruthy();
    });
  });

  test('should load shared theme resources without legacy toggle', () => {
    const themeHTML = loadHTMLFile('shared-theme.html');
    document.body.innerHTML = themeHTML;
    // Legacy #theme-toggle removed; ensure no element exists
    expect(document.getElementById('theme-toggle')).toBeFalsy();
  });

  test('should have consistent configuration tokens', () => {
    const configHTML = loadHTMLFile('shared-config.html');
    ['tailwind', 'primary', 'secondary', 'accent'].forEach(token => {
      expect(configHTML.includes(token)).toBe(true);
    });
  });

  test('should validate shared component integration', () => {
    document.body.innerHTML = '<div id="shared-navigation"></div>';
    const navHTML = loadHTMLFile('shared-nav.html');
    document.getElementById('shared-navigation').innerHTML = navHTML;

    expect(document.getElementById('menu-toggle')).toBeTruthy();
    expect(document.getElementById('sidebar')).toBeTruthy();
    // Theme toggle intentionally removed
    expect(document.getElementById('theme-toggle')).toBeFalsy();
  });

  test('should have proper accessibility attributes', () => {
    const navHTML = loadHTMLFile('shared-nav.html');
    document.body.innerHTML = navHTML;

    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    expect(toggle).toBeTruthy();
    expect(sidebar).toBeTruthy();
    expect(toggle.getAttribute('aria-label')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBeDefined();
    expect(sidebar.getAttribute('aria-label')).toBeTruthy();
  });

  test('should validate form structures on index.html', () => {
    const indexHTML = loadHTMLFile('index.html');
    document.body.innerHTML = indexHTML;

    const form = document.getElementById('login-form');
    expect(form).toBeTruthy();

    const email = form.querySelector('input[type="email"]');
    const password = form.querySelector('input[type="password"]');

    expect(email).toBeTruthy();
    expect(password).toBeTruthy();
    expect(
      email.hasAttribute('required') ||
      email.getAttribute('aria-required') === 'true'
    ).toBeTruthy();
  });
});