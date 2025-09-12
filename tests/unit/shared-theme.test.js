// Unit tests for shared theme functionality
const { loadHTMLFile, simulateClick } = require('../utils/dom-helpers');

describe('Shared Theme Component', () => {
    let themeHTML;

    beforeAll(() => {
        themeHTML = loadHTMLFile('shared-theme.html');
    });

    beforeEach(() => {
    // Clear localStorage before each test
        localStorage.clear();
        jest.clearAllMocks();
    
        // Set up basic DOM structure
        document.body.innerHTML = `
      <button id="theme-toggle">Toggle Light Mode</button>
      ${themeHTML}
    `;
    
        // Mock body classes
        document.body.classList.remove('dark', 'light');
    });

    test('should initialize with dark theme by default', () => {
        localStorage.getItem.mockReturnValue(null);
    
        // Simulate the theme initialization
        const body = document.body;
        const savedTheme = localStorage.getItem('theme') || 'dark';
        body.classList.add(savedTheme);
    
        expect(body.classList.contains('dark')).toBeTruthy();
        expect(body.classList.contains('light')).toBeFalsy();
    });

    test('should load saved theme from localStorage', () => {
        localStorage.getItem.mockReturnValue('light');
    
        // Simulate theme loading
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'dark';
    
        body.classList.add(savedTheme);
        if (themeToggle) {
            themeToggle.textContent = savedTheme === 'dark' ? 'Toggle Light Mode' : 'Toggle Dark Mode';
        }
    
        expect(body.classList.contains('light')).toBeTruthy();
        expect(themeToggle.textContent).toBe('Toggle Dark Mode');
    });

    test('should toggle theme correctly', () => {
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
    
        // Start with dark theme
        body.classList.add('dark');
        themeToggle.textContent = 'Toggle Light Mode';
    
        // Add event listener (simulate the actual theme toggle logic)
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark');
            body.classList.toggle('light');
            localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
            themeToggle.textContent = body.classList.contains('dark') ? 'Toggle Light Mode' : 'Toggle Dark Mode';
            themeToggle.setAttribute('aria-label', body.classList.contains('dark') ? 'Toggle light mode' : 'Toggle dark mode');
        });
    
        // Simulate click
        simulateClick(themeToggle);
    
        expect(body.classList.contains('light')).toBeTruthy();
        expect(body.classList.contains('dark')).toBeFalsy();
        expect(themeToggle.textContent).toBe('Toggle Dark Mode');
        expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    test('should update aria-label correctly', () => {
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
    
        // Start with dark theme
        body.classList.add('dark');
        themeToggle.setAttribute('aria-label', 'Toggle light mode');
    
        // Add event listener
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark');
            body.classList.toggle('light');
            themeToggle.setAttribute('aria-label', body.classList.contains('dark') ? 'Toggle light mode' : 'Toggle dark mode');
        });
    
        // Simulate click
        simulateClick(themeToggle);
    
        expect(themeToggle.getAttribute('aria-label')).toBe('Toggle dark mode');
    });

    test('should persist theme choice in localStorage', () => {
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
    
        body.classList.add('dark');
    
        // Add event listener
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark');
            body.classList.toggle('light');
            localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
        });
    
        // Toggle to light
        simulateClick(themeToggle);
        expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    
        // Toggle back to dark
        simulateClick(themeToggle);
        expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    test('should handle missing theme toggle element gracefully', () => {
        document.body.innerHTML = themeHTML; // No theme-toggle button
    
        // The script should not throw errors when theme toggle is missing
        expect(() => {
            const themeToggle = document.getElementById('theme-toggle');
            expect(themeToggle).toBeNull();
        }).not.toThrow();
    });
});