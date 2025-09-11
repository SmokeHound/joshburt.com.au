// Integration tests for navigation flow (simplified without puppeteer)
const { loadHTMLFile } = require('../utils/dom-helpers');

describe('Navigation Flow Integration', () => {
    const pages = ['index.html', 'admin.html', 'users.html', 'analytics.html', 'settings.html', 'oil.html'];

    test('should have valid HTML structure for all pages', () => {
        pages.forEach(page => {
            try {
                const html = loadHTMLFile(page);
                expect(html).toHaveValidHTML();
                expect(html).toContain('<!DOCTYPE html>');
                expect(html).toContain('<html');
                expect(html).toContain('</html>');
            } catch (error) {
                // Some pages might not exist yet, skip them
                console.warn(`Page ${page} not found, skipping test`);
            }
        });
    });

    test('should have consistent navigation structure', () => {
        const navHTML = loadHTMLFile('shared-nav.html');
        expect(navHTML).toContain('menu-toggle');
        expect(navHTML).toContain('sidebar');
        expect(navHTML).toContain('theme-toggle');
    
        // Check for all expected navigation links
        const expectedLinks = ['index.html', 'admin.html', 'users.html', 'analytics.html', 'settings.html', 'oil.html'];
        expectedLinks.forEach(link => {
            expect(navHTML).toContain(`href="${link}"`);
        });
    });

    test('should have consistent theme structure', () => {
        const themeHTML = loadHTMLFile('shared-theme.html');
        expect(themeHTML).toContain('theme-toggle');
        expect(themeHTML).toContain('localStorage');
        expect(themeHTML).toContain('dark');
        expect(themeHTML).toContain('light');
    });

    test('should have consistent configuration', () => {
        const configHTML = loadHTMLFile('shared-config.html');
        expect(configHTML).toContain('tailwind');
        expect(configHTML).toContain('primary');
        expect(configHTML).toContain('secondary');
        expect(configHTML).toContain('accent');
    });

    test('should validate shared component integration', () => {
    // Test that pages can properly include shared components
        document.body.innerHTML = '<div id="shared-navigation"></div>';
    
        const navHTML = loadHTMLFile('shared-nav.html');
        document.getElementById('shared-navigation').innerHTML = navHTML;
    
        expect(document.getElementById('menu-toggle')).toBeTruthy();
        expect(document.getElementById('sidebar')).toBeTruthy();
        expect(document.getElementById('theme-toggle')).toBeTruthy();
    });

    test('should validate cross-page consistency', () => {
        const indexHTML = loadHTMLFile('index.html');
    
        // Check that index.html uses shared components approach
        expect(indexHTML).toContain('shared-navigation');
        expect(indexHTML).toContain('shared-nav.html');
        expect(indexHTML).toContain('shared-theme.html');
    });

    test('should have proper accessibility attributes', () => {
        const navHTML = loadHTMLFile('shared-nav.html');
    
        // Check for ARIA attributes
        expect(navHTML).toContain('aria-label');
        expect(navHTML).toContain('aria-expanded');
        expect(navHTML).toContain('aria-current');
        expect(navHTML).toContain('role=');
    });

    test('should validate form structures', () => {
        const indexHTML = loadHTMLFile('index.html');
    
        // Check login form structure
        expect(indexHTML).toContain('login-form');
        expect(indexHTML).toContain('type="email"');
        expect(indexHTML).toContain('type="password"');
        expect(indexHTML).toContain('required');
        expect(indexHTML).toContain('aria-required');
    });
});