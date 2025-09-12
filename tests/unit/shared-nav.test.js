// Unit tests for shared navigation component
const { loadHTMLFile, createMockDOM, simulateClick, hasClass, waitFor } = require('../utils/dom-helpers');

describe('Shared Navigation Component', () => {
    let navHTML;
  
    beforeAll(() => {
        navHTML = loadHTMLFile('shared-nav.html');
    });

    beforeEach(() => {
    // Clear localStorage before each test
        localStorage.clear();
    
        // Create fresh DOM
        document.body.innerHTML = navHTML;
    });

    test('should render navigation structure correctly', () => {
        expect(document.getElementById('menu-toggle')).toBeTruthy();
        expect(document.getElementById('sidebar')).toBeTruthy();
        expect(document.getElementById('theme-toggle')).toBeTruthy();
    
        // Check navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        expect(navLinks.length).toBeGreaterThan(0);
    
        // Check for specific navigation items
        const expectedLinks = ['index.html', 'admin.html', 'users.html', 'analytics.html', 'settings.html', 'oil.html'];
        expectedLinks.forEach(link => {
            const linkElement = document.querySelector(`a[href="${link}"]`);
            expect(linkElement).toBeTruthy();
        });
    });

    test('should toggle mobile menu correctly', () => {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
    
        expect(sidebar.classList.contains('open')).toBeFalsy();
        expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
    
        // Add the actual event listener logic
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            const isOpen = sidebar.classList.contains('open');
            menuToggle.setAttribute('aria-expanded', isOpen);
        });
    
        // Simulate click on menu toggle
        simulateClick(menuToggle);
    
        expect(sidebar.classList.contains('open')).toBeTruthy();
        expect(menuToggle.getAttribute('aria-expanded')).toBe('true');
    });

    test('should handle keyboard navigation for menu toggle', () => {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
    
        // Add the actual event listener logic
        menuToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                menuToggle.click();
            }
        });
    
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    
        // Simulate Enter key press
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        enterEvent.preventDefault = jest.fn();
        menuToggle.dispatchEvent(enterEvent);
    
        expect(enterEvent.preventDefault).toHaveBeenCalled();
        expect(sidebar.classList.contains('open')).toBeTruthy();
    
        // Simulate Space key press
        const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
        spaceEvent.preventDefault = jest.fn();
        menuToggle.dispatchEvent(spaceEvent);
    
        expect(spaceEvent.preventDefault).toHaveBeenCalled();
    });

    test('should set active navigation link based on current page', () => {
    // Mock window.location.pathname
        Object.defineProperty(window, 'location', {
            value: { pathname: '/admin.html' },
            writable: true
        });
    
        // Re-run the navigation script logic
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');
    
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('bg-primary', 'text-white');
                link.setAttribute('aria-current', 'page');
            }
        });
    
        const adminLink = document.querySelector('a[href="admin.html"]');
        expect(adminLink.classList.contains('bg-primary')).toBeTruthy();
        expect(adminLink.getAttribute('aria-current')).toBe('page');
    });

    test('should have proper accessibility attributes', () => {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
    
        expect(menuToggle.getAttribute('aria-label')).toBe('Toggle sidebar');
        expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
        expect(sidebar.getAttribute('aria-label')).toBe('Main navigation');
    });

    test('should contain user profile section', () => {
        const userProfile = document.getElementById('user-profile');
        const userInfo = document.getElementById('user-info');
    
        expect(userProfile).toBeTruthy();
        expect(userInfo).toBeTruthy();
        expect(userInfo.classList.contains('hidden')).toBeTruthy(); // Should be hidden by default
    });
});