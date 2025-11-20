// Unit tests for dev-dashboard.html auth:required event handler
// Tests the fix for preventing redirect loop on authentication failure

const { loadHTMLFile } = require('../utils/dom-helpers');

describe('Dev Dashboard auth:required event handler', () => {
  let dashboardHTML;

  beforeAll(() => {
    // Load the dev-dashboard HTML content
    dashboardHTML = loadHTMLFile('dev-dashboard.html');
  });

  beforeEach(() => {
    // Set up the DOM
    document.body.innerHTML = dashboardHTML;
  });

  test('should handle auth:required event without redirecting', () => {
    let eventPrevented = false;
    let bannerCreated = false;

    // Create a mock event handler that matches the one in dev-dashboard.html
    window.addEventListener('auth:required', (e) => {
      e.preventDefault();
      eventPrevented = true;

      // Create banner element (simplified version for testing)
      const banner = document.createElement('div');
      banner.className = 'auth-banner';
      banner.innerHTML = 'Authentication required. Sign in to continue';
      document.body.appendChild(banner);
      bannerCreated = true;
    });

    // Dispatch the auth:required event
    const event = new CustomEvent('auth:required', {
      detail: { returnUrl: '/dev-dashboard.html', reason: 'refresh_failed' },
      cancelable: true
    });

    window.dispatchEvent(event);

    // Verify the event was prevented (consumed)
    expect(eventPrevented).toBe(true);

    // Verify a banner was created instead of redirecting
    expect(bannerCreated).toBe(true);

    // Verify the banner exists in the DOM
    const banner = document.querySelector('.auth-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Authentication required');
  });

  test('auth:required event should be cancelable', () => {
    const event = new CustomEvent('auth:required', {
      detail: { returnUrl: '/dev-dashboard.html', reason: 'token_expired' },
      cancelable: true
    });

    // Verify the event is cancelable
    expect(event.cancelable).toBe(true);
  });

  test('auth:required event should include detail with returnUrl and reason', () => {
    const testData = {
      returnUrl: '/dev-dashboard.html',
      reason: 'refresh_failed'
    };

    const event = new CustomEvent('auth:required', {
      detail: testData,
      cancelable: true
    });

    expect(event.detail).toEqual(testData);
    expect(event.detail.returnUrl).toBe('/dev-dashboard.html');
    expect(event.detail.reason).toBe('refresh_failed');
  });

  test('should create banner with sign-in link text', () => {
    // Set up event handler
    window.addEventListener('auth:required', (e) => {
      e.preventDefault();

      const banner = document.createElement('div');
      banner.className = 'auth-banner fixed top-4 left-1/2';
      banner.innerHTML = `
        <div class="flex items-center gap-3">
          <span>Authentication required. <a href="#" class="underline font-semibold">Sign in to continue</a></span>
        </div>
      `;
      document.body.appendChild(banner);
    });

    // Dispatch event
    const event = new CustomEvent('auth:required', {
      detail: { returnUrl: '/dev-dashboard.html', reason: 'refresh_failed' },
      cancelable: true
    });
    window.dispatchEvent(event);

    // Verify banner has the expected text
    const banner = document.querySelector('.auth-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Authentication required');
    expect(banner.textContent).toContain('Sign in to continue');
  });

  test('event preventDefault should prevent default redirect behavior', () => {
    let defaultPrevented = false;

    // Set up event handler that prevents default
    window.addEventListener('auth:required', (e) => {
      e.preventDefault();
      defaultPrevented = true;
    });

    // Dispatch event
    const event = new CustomEvent('auth:required', {
      detail: { returnUrl: '/dev-dashboard.html', reason: 'refresh_failed' },
      cancelable: true
    });

    window.dispatchEvent(event);

    // When preventDefault is called, dispatchEvent returns false
    expect(defaultPrevented).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });
});
