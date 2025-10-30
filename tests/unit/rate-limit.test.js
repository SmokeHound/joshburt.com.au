// Unit tests for rate limiting utility
const { checkRateLimit, RATE_LIMITS, clearRateLimits } = require('../../utils/rate-limit');

describe('Rate Limiting Utilities', () => {
  beforeEach(() => {
    // Clean up before each test
    clearRateLimits();
  });

  test('should allow requests within limit', () => {
    const key = 'test:user1';
    const limit = 5;
    const windowMs = 60000;

    for (let i = 0; i < limit; i++) {
      const result = checkRateLimit(key, limit, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - i - 1);
    }
  });

  test('should block requests exceeding limit', () => {
    const key = 'test:user2';
    const limit = 3;
    const windowMs = 60000;

    // Use up the limit
    for (let i = 0; i < limit; i++) {
      checkRateLimit(key, limit, windowMs);
    }

    // Next request should be blocked
    const result = checkRateLimit(key, limit, windowMs);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  test('should reset after window expires', async () => {
    const key = 'test:user3';
    const limit = 2;
    const windowMs = 100; // Very short window for testing

    // Use up the limit
    checkRateLimit(key, limit, windowMs);
    checkRateLimit(key, limit, windowMs);

    // Should be blocked
    let result = checkRateLimit(key, limit, windowMs);
    expect(result.allowed).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, windowMs + 10));

    // Should be allowed again
    result = checkRateLimit(key, limit, windowMs);
    expect(result.allowed).toBe(true);
  });

  test('should have correct preset configurations', () => {
    expect(RATE_LIMITS.auth.limit).toBe(10);
    expect(RATE_LIMITS.auth.windowMs).toBe(60000);
    expect(RATE_LIMITS.api.limit).toBe(100);
    expect(RATE_LIMITS.strict.limit).toBe(5);
    expect(RATE_LIMITS.standard.limit).toBe(30);
  });

  test('should maintain separate limits for different keys', () => {
    const limit = 2;
    const windowMs = 60000;

    // User 1 uses limit
    checkRateLimit('test:user1', limit, windowMs);
    checkRateLimit('test:user1', limit, windowMs);

    // User 1 should be at limit
    let result = checkRateLimit('test:user1', limit, windowMs);
    expect(result.allowed).toBe(false);

    // User 2 should still have full limit
    result = checkRateLimit('test:user2', limit, windowMs);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(limit - 1);
  });
});
