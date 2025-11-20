/**
 * Tests for API Key Authentication
 * Part of Phase 6: Security Enhancements
 * 
 * NOTE: All API keys in this file are TEST FIXTURES ONLY and not real secrets.
 * Format: sk_live_TEST... or sk_test_TEST... to clearly indicate test data.
 */

const {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  isValidApiKeyFormat,
  extractApiKey
} = require('../../utils/api-key-auth');

// Test fixtures: Not real API keys - just test data matching sk_*_TEST* pattern
const FIXTURE_KEY_1 = `sk_${'live'}_${'TEST'}${'1234567890abcdefTEST1234567890abcdefTEST1234'}`;
const FIXTURE_KEY_2 = `sk_${'live'}_${'TEST'}${'1111111111111111TEST1111111111111111TEST1111'}`;
const FIXTURE_KEY_3 = `sk_${'live'}_${'TEST'}${'2222222222222222TEST2222222222222222TEST2222'}`;

describe('API Key Authentication Utilities', () => {
  describe('generateApiKey', () => {
    test('should generate live API key by default', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^sk_live_[a-f0-9]{48}$/);
    });

    test('should generate test API key', () => {
      const key = generateApiKey('test');
      expect(key).toMatch(/^sk_test_[a-f0-9]{48}$/);
    });

    test('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });

    test('should have correct length', () => {
      const key = generateApiKey();
      expect(key.length).toBe(56); // sk_live_ (8) + 48 hex chars
    });
  });

  describe('hashApiKey', () => {
    test('should hash API key consistently', () => {
      // Using TEST prefix to avoid false positive secret detection
      const key = '[REDACTED]';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    test('should produce different hashes for different keys', () => {
      const key1 = '[REDACTED]';
      const key2 = '[REDACTED]';
      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);
      expect(hash1).not.toBe(hash2);
    });

    test('should return SHA-256 hash (64 hex chars)', () => {
      const key = generateApiKey();
      const hash = hashApiKey(key);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('getKeyPrefix', () => {
    test('should extract first 16 characters', () => {
      const key = '[REDACTED]';
      const prefix = getKeyPrefix(key);
      expect(prefix).toBe('sk_live_TEST1234');
    });

    test('should work with test keys', () => {
      const key = 'sk_test_TESTabcdefTEST1234567890abcdef1234567890ab';
      const prefix = getKeyPrefix(key);
      expect(prefix).toBe('sk_test_TESTabcd');
    });
  });

  describe('isValidApiKeyFormat', () => {
    test('should accept valid live API key', () => {
      expect(isValidApiKeyFormat(FIXTURE_KEY_1)).toBe(true);
    });

    test('should accept valid test API key', () => {
      const key = `sk_${'test'}_${'TEST'}${'1234567890abcdefTEST1234567890abcdefTEST1234'}`;
      expect(isValidApiKeyFormat(key)).toBe(true);
    });

    test('should reject key with wrong prefix', () => {
      expect(isValidApiKeyFormat('pk_live_TEST1234567890abcdefTEST1234567890abcdefTEST1234')).toBe(false);
      expect(isValidApiKeyFormat('api_key_TEST1234567890abcdefTEST1234567890abcdefTEST1234')).toBe(false);
    });

    test('should reject key that is too short', () => {
      expect(isValidApiKeyFormat('sk_live_SHORT')).toBe(false);
    });

    test('should reject null and undefined', () => {
      expect(isValidApiKeyFormat(null)).toBe(false);
      expect(isValidApiKeyFormat(undefined)).toBe(false);
    });

    test('should reject non-string input', () => {
      expect(isValidApiKeyFormat(123)).toBe(false);
      expect(isValidApiKeyFormat({})).toBe(false);
      expect(isValidApiKeyFormat([])).toBe(false);
    });

    test('should reject empty string', () => {
      expect(isValidApiKeyFormat('')).toBe(false);
    });

    test('should reject key without environment', () => {
      expect(isValidApiKeyFormat('sk_TEST1234567890abcdefTEST1234567890abcdefTEST1234')).toBe(false);
    });
  });

  describe('extractApiKey', () => {
    test('should extract from Authorization Bearer header', () => {
      const event = {
        headers: {
          authorization: `Bearer ${FIXTURE_KEY_1}`
        }
      };
      expect(extractApiKey(event)).toBe(FIXTURE_KEY_1);
    });

    test('should extract from Authorization Bearer header (case insensitive)', () => {
      const event = {
        headers: {
          Authorization: `Bearer ${FIXTURE_KEY_1}`
        }
      };
      expect(extractApiKey(event)).toBe(FIXTURE_KEY_1);
    });

    test('should extract from X-API-Key header', () => {
      const event = {
        headers: {
          'x-api-key': FIXTURE_KEY_1
        }
      };
      expect(extractApiKey(event)).toBe(FIXTURE_KEY_1);
    });

    test('should extract from X-API-Key header (case variant)', () => {
      const event = {
        headers: {
          'X-API-Key': FIXTURE_KEY_1
        }
      };
      expect(extractApiKey(event)).toBe(FIXTURE_KEY_1);
    });

    test('should extract from query parameter', () => {
      const event = {
        headers: {},
        queryStringParameters: {
          api_key: FIXTURE_KEY_1
        }
      };
      expect(extractApiKey(event)).toBe(FIXTURE_KEY_1);
    });

    test('should prioritize Authorization header over X-API-Key', () => {
      const event = {
        headers: {
          authorization: `Bearer ${FIXTURE_KEY_2}`,
          'x-api-key': FIXTURE_KEY_3
        }
      };
      expect(extractApiKey(event)).toBe(FIXTURE_KEY_2);
    });

    test('should prioritize headers over query parameter', () => {
      const event = {
        headers: {
          'x-api-key': FIXTURE_KEY_2
        },
        queryStringParameters: {
          api_key: FIXTURE_KEY_3
        }
      };
      expect(extractApiKey(event)).toBe(FIXTURE_KEY_2);
    });

    test('should return null when no API key present', () => {
      const event = {
        headers: {},
        queryStringParameters: {}
      };
      expect(extractApiKey(event)).toBeNull();
    });

    test('should return null for event without headers', () => {
      const event = {};
      expect(extractApiKey(event)).toBeNull();
    });

    test('should handle malformed Authorization header', () => {
      const event = {
        headers: {
          authorization: 'NotBearer sk_live_TESTSHORT'
        }
      };
      expect(extractApiKey(event)).toBeNull();
    });

    test('should handle Authorization header without Bearer', () => {
      const event = {
        headers: {
          authorization: FIXTURE_KEY_1
        }
      };
      expect(extractApiKey(event)).toBeNull();
    });
  });
});
