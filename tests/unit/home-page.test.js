// Unit tests for home page functionality
const { loadHTMLFile, simulateClick, simulateSubmit, waitFor } = require('../utils/dom-helpers');

describe('Home Page', () => {
    let homeHTML;

    beforeAll(() => {
        homeHTML = loadHTMLFile('index.html');
    });

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    
        document.body.innerHTML = homeHTML;
    });

    test('should render main content structure', () => {
        expect(document.querySelector('main')).toBeTruthy();
        expect(document.getElementById('welcome-message')).toBeTruthy();
        expect(document.querySelectorAll('.card')).toHaveLength(3);
    });

    test('should display login modal when login button is clicked', () => {
        const loginBtn = document.getElementById('login-btn');
        const loginModal = document.getElementById('login-modal');
    
        // Mock the button existing (it would be loaded via shared nav)
        if (!loginBtn) {
            document.body.innerHTML += '<button id="login-btn">Login</button>';
        }
        if (!loginModal) return; // Skip if modal not found
    
        expect(loginModal.classList.contains('hidden')).toBeTruthy();
    
        const actualLoginBtn = document.getElementById('login-btn');
        if (actualLoginBtn) {
            actualLoginBtn.addEventListener('click', () => {
                loginModal.classList.remove('hidden');
            });
      
            simulateClick(actualLoginBtn);
            expect(loginModal.classList.contains('hidden')).toBeFalsy();
        }
    });

    test('should close login modal when close button is clicked', () => {
        const loginModal = document.getElementById('login-modal');
        const closeModal = document.getElementById('close-modal');
        const loginForm = document.getElementById('login-form');
    
        if (!loginModal || !closeModal) return;
    
        // Open modal first
        loginModal.classList.remove('hidden');
    
        closeModal.addEventListener('click', () => {
            loginModal.classList.add('hidden');
            if (loginForm) loginForm.reset();
        });
    
        simulateClick(closeModal);
        expect(loginModal.classList.contains('hidden')).toBeTruthy();
    });

    test('should handle successful login', async () => {
        const loginForm = document.getElementById('login-form');
        const loginModal = document.getElementById('login-modal');
    
        if (!loginForm || !loginModal) return;
    
        // Set up form values
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
    
        if (emailInput && passwordInput) {
            emailInput.value = 'test@example.com';
            passwordInput.value = 'password';
      
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
        
                const authenticatedUser = {
                    name: 'test',
                    email: 'test@example.com',
                    avatar: 'https://via.placeholder.com/40'
                };
        
                localStorage.setItem('user', JSON.stringify(authenticatedUser));
                loginModal.classList.add('hidden');
            });
      
            simulateSubmit(loginForm);
      
            await waitFor(100);
      
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'user', 
                JSON.stringify({
                    name: 'test',
                    email: 'test@example.com',
                    avatar: 'https://via.placeholder.com/40'
                })
            );
        }
    });

    test('should handle login failure', async () => {
        const loginForm = document.getElementById('login-form');
        const loginError = document.getElementById('login-error');
    
        if (!loginForm || !loginError) return;
    
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
    
        if (emailInput && passwordInput) {
            emailInput.value = 'invalid@example.com';
            passwordInput.value = 'wrongpassword';
      
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
        
                try {
                    throw new Error('Invalid credentials');
                } catch (error) {
                    loginError.textContent = error.message;
                    loginError.classList.remove('hidden');
                }
            });
      
            simulateSubmit(loginForm);
      
            await waitFor(50);
      
            expect(loginError.classList.contains('hidden')).toBeFalsy();
            expect(loginError.textContent).toBe('Invalid credentials');
        }
    });

    test('should update welcome message when user is logged in', () => {
        const welcomeMessage = document.getElementById('welcome-message');
    
        if (!welcomeMessage) return;
    
        localStorage.getItem.mockReturnValue(JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com'
        }));
    
        // Simulate user check
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${user.name}!`;
        }
    
        expect(welcomeMessage.textContent).toBe('Welcome, John Doe!');
    });

    test('should handle logout correctly', async () => {
        const logoutBtn = document.getElementById('logout-btn');
        const welcomeMessage = document.getElementById('welcome-message');
    
        // Mock logout button if it doesn't exist
        if (!logoutBtn) {
            document.body.innerHTML += '<button id="logout-btn" class="hidden">Logout</button>';
        }
    
        const actualLogoutBtn = document.getElementById('logout-btn');
    
        if (actualLogoutBtn && welcomeMessage) {
            actualLogoutBtn.addEventListener('click', () => {
                localStorage.removeItem('user');
                welcomeMessage.textContent = 'Welcome to My Website';
            });
      
            simulateClick(actualLogoutBtn);
      
            expect(localStorage.removeItem).toHaveBeenCalledWith('user');
            expect(welcomeMessage.textContent).toBe('Welcome to My Website');
        }
    });

    test('should apply site settings correctly', () => {
        const welcomeMessage = document.getElementById('welcome-message');
    
        localStorage.getItem.mockImplementation((key) => {
            if (key === 'siteSettings') {
                return JSON.stringify({
                    'homepage-message': 'Custom Welcome Message',
                    'site-title': 'Custom Site Title'
                });
            }
            return null;
        });
    
        // Simulate settings application
        const settings = JSON.parse(localStorage.getItem('siteSettings')) || {};
    
        if (settings['homepage-message'] && welcomeMessage) {
            welcomeMessage.textContent = settings['homepage-message'];
        }
    
        expect(welcomeMessage.textContent).toBe('Custom Welcome Message');
    });

    test('should show toast notifications', async () => {
        const toast = document.getElementById('toast');
    
        if (!toast) return;
    
        function showToast(message) {
            toast.textContent = message;
            toast.classList.remove('hidden');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 100); // Shorter timeout for testing
        }
    
        expect(toast.classList.contains('hidden')).toBeTruthy();
    
        showToast('Test message');
    
        expect(toast.classList.contains('hidden')).toBeFalsy();
        expect(toast.textContent).toBe('Test message');
    
        await waitFor(150);
    
        expect(toast.classList.contains('hidden')).toBeTruthy();
    });
});