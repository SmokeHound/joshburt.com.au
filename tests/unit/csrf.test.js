// Unit tests for CSRF protection utilities
const { generateCSRFToken, validateCSRFToken, consumeCSRFToken, cleanupCSRFTokens } = require('../../utils/csrf');

describe('CSRF Protection Utilities', () => {
  beforeEach(() => {
    // Clean up before each test
    cleanupCSRFTokens();
  });

  test('should generate valid CSRF tokens', () => {
    const sessionId = 'user:123';
    const token = generateCSRFToken(sessionId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes = 64 hex chars
  });

  test('should generate unique tokens', () => {
    const sessionId = 'user:123';
    const token1 = generateCSRFToken(sessionId);
    const token2 = generateCSRFToken(sessionId);

    expect(token1).not.toBe(token2);
  });

  test('should validate correct token and session', () => {
    const sessionId = 'user:123';
    const token = generateCSRFToken(sessionId);

    const isValid = validateCSRFToken(token, sessionId);
    expect(isValid).toBe(true);
  });

  test('should reject token with wrong session', () => {
    const sessionId1 = 'user:123';
    const sessionId2 = 'user:456';
    const token = generateCSRFToken(sessionId1);

    const isValid = validateCSRFToken(token, sessionId2);
    expect(isValid).toBe(false);
  });

  test('should reject invalid token', () => {
    const sessionId = 'user:123';
    const invalidToken = 'invalid-token';

    const isValid = validateCSRFToken(invalidToken, sessionId);
    expect(isValid).toBe(false);
  });

  test('should reject null/undefined tokens', () => {
    const sessionId = 'user:123';

    expect(validateCSRFToken(null, sessionId)).toBe(false);
    expect(validateCSRFToken(undefined, sessionId)).toBe(false);
    expect(validateCSRFToken('', sessionId)).toBe(false);
  });

  test('should consume token on first use', () => {
    const sessionId = 'user:123';
    const token = generateCSRFToken(sessionId);

    // First consumption should succeed
    const firstUse = consumeCSRFToken(token, sessionId);
    expect(firstUse).toBe(true);

    // Second consumption should fail
    const secondUse = consumeCSRFToken(token, sessionId);
    expect(secondUse).toBe(false);
  });

  test('should validate token without consuming', () => {
    const sessionId = 'user:123';
    const token = generateCSRFToken(sessionId);

    // Validate multiple times
    expect(validateCSRFToken(token, sessionId)).toBe(true);
    expect(validateCSRFToken(token, sessionId)).toBe(true);

    // Can still consume
    expect(consumeCSRFToken(token, sessionId)).toBe(true);
  });
});
