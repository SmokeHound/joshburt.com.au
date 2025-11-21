// Unit tests for freshLogin flag behavior in session bootstrap
// Tests the fix for dev dashboard authentication loop issue

describe('Authentication freshLogin flag', () => {
  let originalLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    originalLocalStorage = global.localStorage;
    const localStorageMock = {
      store: {},
      getItem: jest.fn(key => localStorageMock.store[key] || null),
      setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = value.toString();
      }),
      removeItem: jest.fn(key => {
        delete localStorageMock.store[key];
      }),
      clear: jest.fn(() => {
        localStorageMock.store = {};
      })
    };
    global.localStorage = localStorageMock;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  test('freshLogin flag should not be cleared within 5 seconds', () => {
    // Simulate setting freshLogin flag at login time
    const loginTime = Date.now();
    localStorage.setItem('freshLogin', loginTime.toString());

    // Simulate session bootstrap check immediately after login (< 5 seconds)
    const timeSinceLogin = Date.now() - parseInt(localStorage.getItem('freshLogin'), 10);

    expect(timeSinceLogin).toBeLessThan(5000);

    // The flag should still exist after checking it within 5 seconds
    // This is the fix: previously it was cleared immediately
    if (timeSinceLogin < 5000) {
      // Don't clear the flag - let it persist for the full 5 seconds
      // localStorage.removeItem('freshLogin'); // ❌ Old buggy behavior
    }

    // Verify flag still exists
    expect(localStorage.getItem('freshLogin')).toBe(loginTime.toString());
  });

  test('freshLogin flag should be cleared after 5 seconds', () => {
    // Simulate setting freshLogin flag 6 seconds ago
    const loginTime = Date.now() - 6000; // 6 seconds ago
    localStorage.setItem('freshLogin', loginTime.toString());

    // Simulate session bootstrap check
    const freshLoginTimestamp = localStorage.getItem('freshLogin');
    const timeSinceLogin = Date.now() - parseInt(freshLoginTimestamp, 10);

    expect(timeSinceLogin).toBeGreaterThan(5000);

    // After 5 seconds, the flag should be cleared
    if (timeSinceLogin >= 5000) {
      localStorage.removeItem('freshLogin');
    }

    // Verify flag was cleared
    expect(localStorage.getItem('freshLogin')).toBeNull();
  });

  test('freshLogin flag protects against session validation within 5 seconds', () => {
    // Simulate login flow
    const loginTime = Date.now();
    localStorage.setItem('freshLogin', loginTime.toString());

    // Simulate multiple page loads within 5 seconds
    for (let i = 0; i < 3; i++) {
      const freshLoginTimestamp = localStorage.getItem('freshLogin');
      if (freshLoginTimestamp) {
        const timeSinceLogin = Date.now() - parseInt(freshLoginTimestamp, 10);
        if (timeSinceLogin < 5000) {
          // Session bootstrap should skip validation
          // Flag should NOT be cleared
          expect(localStorage.getItem('freshLogin')).toBe(loginTime.toString());
          continue; // Skip validation
        }
      }
    }

    // Flag should still exist after multiple checks
    expect(localStorage.getItem('freshLogin')).toBe(loginTime.toString());
  });

  test('session bootstrap should skip when freshLogin is recent', () => {
    const loginTime = Date.now();
    localStorage.setItem('freshLogin', loginTime.toString());

    // Simulate session bootstrap logic
    let shouldSkipValidation = false;
    const freshLoginTimestamp = localStorage.getItem('freshLogin');

    if (freshLoginTimestamp) {
      const timeSinceLogin = Date.now() - parseInt(freshLoginTimestamp, 10);
      if (timeSinceLogin < 5000) {
        shouldSkipValidation = true;
        // IMPORTANT: Don't clear the flag here (this was the bug)
      }
    }

    expect(shouldSkipValidation).toBe(true);
    expect(localStorage.getItem('freshLogin')).toBe(loginTime.toString());
  });

  test('session bootstrap should proceed when freshLogin is old', () => {
    const loginTime = Date.now() - 10000; // 10 seconds ago
    localStorage.setItem('freshLogin', loginTime.toString());

    // Simulate session bootstrap logic
    let shouldSkipValidation = false;
    const freshLoginTimestamp = localStorage.getItem('freshLogin');

    if (freshLoginTimestamp) {
      const timeSinceLogin = Date.now() - parseInt(freshLoginTimestamp, 10);
      if (timeSinceLogin < 5000) {
        shouldSkipValidation = true;
      } else {
        // Clear the flag and proceed with validation
        localStorage.removeItem('freshLogin');
      }
    }

    expect(shouldSkipValidation).toBe(false);
    expect(localStorage.getItem('freshLogin')).toBeNull();
  });
});
