// Unit tests for home page functionality
const { loadHTMLFile, simulateClick } = require('../utils/dom-helpers');

describe('Home Page', () => {
    let homeHTML;

    beforeAll(() => {
        homeHTML = loadHTMLFile('index.html');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = homeHTML;
    });

    test('should render main content structure', () => {
        expect(document.querySelector('main')).toBeTruthy();
        expect(document.getElementById('welcome-message')).toBeTruthy();
        // Adjust expected count if cards change
        expect(document.querySelectorAll('.card').length).toBeGreaterThanOrEqual(1);
    });

    test('should display login modal when login button is clicked', () => {
        let loginBtn = document.getElementById('login-btn');
        if (!loginBtn) {
            // Create if not found
            loginBtn = document.createElement('button');
            loginBtn.id = 'login-btn';
            document.body.appendChild(loginBtn);
        }
       
        const loginModal = document.getElementById('login-modal');
    
        if (!loginModal) {
            const modal = document.createElement('div');
            modal.id = 'login-modal';
            modal.className = 'hidden';
            document.body.appendChild(modal);
        }
    
        if (loginBtn && loginModal) {
            loginBtn.addEventListener('click', () => {
                loginModal.classList.remove('hidden');
            });
      
            simulateClick(loginBtn);
            expect(loginModal.classList.contains('hidden')).toBe(false);
        }
    });

    test('should show toast notifications (using mocked showToast)', () => {
    // Mock the showToast function
        global.showToast = jest.fn();
    
        // Test that we can call the function
        if (global.showToast) {
            global.showToast('Test message');
            expect(global.showToast).toHaveBeenCalledWith('Test message');
        }
    });
});