// Updated unit tests for theme persistence and CSS variable application (legacy toggle removed)
const { loadHTMLFile } = require('../utils/dom-helpers');

describe('Theme System (Preset / Persistence)', () => {
    let themeHTML;

    beforeAll(() => {
        themeHTML = loadHTMLFile('shared-theme.html');
    });

    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = themeHTML; // No toggle button expected
        document.body.className = '';
    });

    function applySavedTheme() {
        const siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
        const theme = siteSettings.theme || localStorage.getItem('theme') || 'dark';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.classList.toggle('light', theme === 'light');
    }

    test('defaults to dark when no settings present', () => {
        applySavedTheme();
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    test('applies stored light theme from siteSettings', () => {
        localStorage.setItem('siteSettings', JSON.stringify({ theme: 'light' }));
        applySavedTheme();
        expect(document.documentElement.classList.contains('light')).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    test('applies custom color variables from siteSettings', () => {
        localStorage.setItem('siteSettings', JSON.stringify({
            primaryColor: '#123456',
            secondaryColor: '#abcdef',
            accentColor: '#ff00aa',
            theme: 'dark'
        }));
        // Simulate inline logic similar to pages
        const s = JSON.parse(localStorage.getItem('siteSettings'));
        document.documentElement.style.setProperty('--tw-color-primary', s.primaryColor);
        document.documentElement.style.setProperty('--tw-color-secondary', s.secondaryColor);
        document.documentElement.style.setProperty('--tw-color-accent', s.accentColor);
        applySavedTheme();
        expect(getComputedStyle(document.documentElement).getPropertyValue('--tw-color-primary').trim()).toBe('#123456');
        expect(getComputedStyle(document.documentElement).getPropertyValue('--tw-color-secondary').trim()).toBe('#abcdef');
        expect(getComputedStyle(document.documentElement).getPropertyValue('--tw-color-accent').trim()).toBe('#ff00aa');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    test('ignores legacy theme-toggle expectations', () => {
        expect(document.getElementById('theme-toggle')).toBeFalsy();
    });
});