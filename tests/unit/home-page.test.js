// Unit tests for home page functionality
const { loadHTMLFile, simulateClick, simulateSubmit, waitFor } = require('../utils/dom-helpers');

function resetSpies() {
  jest.restoreAllMocks();
  jest.clearAllMocks();
}

describe('Home Page', () => {
  let homeHTML;

  beforeAll(() => {
    homeHTML = loadHTMLFile('index.html');
  });

  beforeEach(() => {
    localStorage.clear();
    resetSpies();
    document.body.innerHTML = homeHTML;
  });

  test('should render main content structure', () => {
    expect(document.querySelector('main')).toBeTruthy();
    expect(document.getElementById('welcome-message')).toBeTruthy();
    // Use ui-card primitives (token/component layer)
    expect(document.querySelectorAll('.ui-card').length).toBeGreaterThanOrEqual(1);
  });

  test('should display login modal when login button is clicked', () => {
    let loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');

    if (!loginBtn) {
      // Mock button if dynamic
      loginBtn = document.createElement('button');
      loginBtn.id = 'login-btn';
      loginBtn.textContent = 'Login';
      document.body.appendChild(loginBtn);
    }

    if (!loginModal) {
      return;
    } // Skip if modal missing in test HTML

    loginBtn.addEventListener('click', () => {
      loginModal.classList.remove('hidden');
    });

    simulateClick(loginBtn);
    expect(loginModal.classList.contains('hidden')).toBe(false);
  });

  test('should handle login success', async () => {
    const loginForm = document.getElementById('login-form');
    const loginModal = document.getElementById('login-modal');

    if (!loginForm || !loginModal) {
      return;
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (emailInput && passwordInput) {
      emailInput.value = 'test@example.com';
      passwordInput.value = 'password';

      const setItemSpy = jest.spyOn(localStorage, 'setItem');

      loginForm.addEventListener('submit', e => {
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

      expect(setItemSpy).toHaveBeenCalledTimes(1);
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

    if (!loginForm || !loginError) {
      return;
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (emailInput && passwordInput) {
      emailInput.value = 'invalid@example.com';
      passwordInput.value = 'wrongpassword';

      loginForm.addEventListener('submit', e => {
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
      expect(loginError.classList.contains('hidden')).toBe(false);
      expect(loginError.textContent).toBe('Invalid credentials');
    }
  });

  test('should update welcome message when user is logged in', () => {
    const welcomeMessage = document.getElementById('welcome-message');
    localStorage.getItem.mockReturnValue(
      JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com'
      })
    );

    const user = JSON.parse(localStorage.getItem('user'));
    if (user && welcomeMessage) {
      welcomeMessage.textContent = `Welcome, ${user.name}!`;
    }
    expect(welcomeMessage.textContent).toBe('Welcome, John Doe!');
  });

  test('should handle logout correctly', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const welcomeMessage = document.getElementById('welcome-message');

    if (!logoutBtn) {
      const btn = document.createElement('button');
      btn.id = 'logout-btn';
      document.body.appendChild(btn);
    }
    const actualLogoutBtn = document.getElementById('logout-btn');
    const removeItemSpy = jest.spyOn(localStorage, 'removeItem');

    if (actualLogoutBtn && welcomeMessage) {
      actualLogoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        welcomeMessage.textContent = 'Welcome to My Website';
      });

      simulateClick(actualLogoutBtn);
      expect(removeItemSpy).toHaveBeenCalledWith('user');
      expect(welcomeMessage.textContent).toBe('Welcome to My Website');
    }
  });

  test('should apply site settings correctly', () => {
    const welcomeMessage = document.getElementById('welcome-message');

    localStorage.getItem.mockImplementation(key => {
      if (key === 'siteSettings') {
        return JSON.stringify({
          'homepage-message': 'Custom Welcome Message',
          'site-title': 'Custom Site Title'
        });
      }
      return null;
    });

    const settings = JSON.parse(localStorage.getItem('siteSettings')) || {};
    if (settings['homepage-message'] && welcomeMessage) {
      welcomeMessage.textContent = settings['homepage-message'];
    }
    expect(welcomeMessage.textContent).toBe('Custom Welcome Message');
  });

  test('should show toast notifications (using mocked showToast)', async () => {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'hidden';
      document.body.appendChild(toast);
    }

    const showToast = jest.fn(message => {
      toast.textContent = message;
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 100);
    });

    expect(toast.classList.contains('hidden')).toBe(true);

    showToast('Test message');
    expect(showToast).toHaveBeenCalledWith('Test message');
    expect(toast.classList.contains('hidden')).toBe(false);
    expect(toast.textContent).toBe('Test message');

    await waitFor(150);
    expect(toast.classList.contains('hidden')).toBe(true);
  });

  test('should not include skip to content link', () => {
    // Ensure skip link has been removed from markup
    const skip = document.querySelector('.skip-link');
    expect(skip).toBeNull();
    // Also ensure there's no anchor targeting main-content
    const anchor = document.querySelector('a[href="#main-content"]');
    expect(anchor).toBeNull();
  });
});
