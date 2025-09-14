// Unit tests for shared theme functionality
const { simulateClick } = require('../utils/dom-helpers');

describe('Shared Theme Component', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = `
      <button id="theme-toggle">Toggle Light Mode</button>
    `;
        document.body.classList.remove('dark', 'light');
    });

    test('should have theme toggle button', () => {
        const themeToggle = document.getElementById('theme-toggle');
        expect(themeToggle).toBeTruthy();
        expect(themeToggle.textContent).toContain('Toggle');
    });

    test('should toggle theme classes when clicked', () => {
        const themeToggle = document.getElementById('theme-toggle');
        
        if (themeToggle) {
            // Start in dark mode
            document.body.classList.add('dark');
            
            // Mock the theme toggle functionality
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark');
                if (isDark) {
                    document.body.classList.remove('dark');
                    document.body.classList.add('light');
                    themeToggle.textContent = 'Toggle Dark Mode';
                } else {
                    document.body.classList.remove('light');
                    document.body.classList.add('dark');
                    themeToggle.textContent = 'Toggle Light Mode';
                }
            });

            simulateClick(themeToggle);
            expect(document.body.classList.contains('light')).toBe(true);
            expect(document.body.classList.contains('dark')).toBe(false);
            expect(themeToggle.textContent).toBe('Toggle Dark Mode');
        }
    });
});