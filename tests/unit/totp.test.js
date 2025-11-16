// Unit tests for TOTP 2FA utilities
const {
  generateTOTPSecret,
  _verifyTOTPToken: _verifyTOTPToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  prepareBackupCodesForStorage,
  parseStoredBackupCodes
} = require('../../utils/totp');

describe('TOTP 2FA Utilities', () => {
  describe('generateTOTPSecret', () => {
    test('should generate a secret with otpauth URL', () => {
      const email = 'test@example.com';
      const result = generateTOTPSecret(email);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('otpauthUrl');
      expect(result.secret).toBeDefined();
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.otpauthUrl).toContain(encodeURIComponent(email));
    });

    test('should include issuer in URL', () => {
      const email = 'test@example.com';
      const issuer = 'TestApp';
      const result = generateTOTPSecret(email, issuer);

      expect(result.otpauthUrl).toContain(issuer);
    });
  });

  describe('generateBackupCodes', () => {
    test('should generate specified number of codes', () => {
      const codes = generateBackupCodes(5);
      expect(codes).toHaveLength(5);
    });

    test('should generate default 10 codes', () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });

    test('should generate unique codes', () => {
      const codes = generateBackupCodes(10);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    test('should generate uppercase hex codes', () => {
      const codes = generateBackupCodes(5);
      codes.forEach(code => {
        expect(code).toMatch(/^[0-9A-F]+$/);
        expect(code.length).toBe(8);
      });
    });
  });

  describe('hashBackupCode', () => {
    test('should hash backup code', () => {
      const code = 'ABCD1234';
      const hash = hashBackupCode(code);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 = 64 hex chars
    });

    test('should generate same hash for same code', () => {
      const code = 'ABCD1234';
      const hash1 = hashBackupCode(code);
      const hash2 = hashBackupCode(code);

      expect(hash1).toBe(hash2);
    });

    test('should generate different hashes for different codes', () => {
      const hash1 = hashBackupCode('ABCD1234');
      const hash2 = hashBackupCode('WXYZ9876');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyBackupCode', () => {
    test('should verify valid backup code', () => {
      const codes = generateBackupCodes(3);
      const hashedCodes = codes.map(c => hashBackupCode(c));

      const result = verifyBackupCode(codes[0], hashedCodes);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid backup code', () => {
      const codes = generateBackupCodes(3);
      const hashedCodes = codes.map(c => hashBackupCode(c));

      const result = verifyBackupCode('INVALID', hashedCodes);
      expect(result.valid).toBe(false);
    });

    test('should remove used code from remaining codes', () => {
      const codes = generateBackupCodes(3);
      const hashedCodes = codes.map(c => hashBackupCode(c));
      const originalLength = hashedCodes.length;

      const result = verifyBackupCode(codes[0], hashedCodes);
      expect(result.valid).toBe(true);
      expect(result.remainingCodes.length).toBe(originalLength - 1);
    });

    test('should not modify original array when code is invalid', () => {
      const codes = generateBackupCodes(3);
      const hashedCodes = codes.map(c => hashBackupCode(c));
      const originalLength = hashedCodes.length;

      const result = verifyBackupCode('INVALID', hashedCodes);
      expect(result.valid).toBe(false);
      expect(result.remainingCodes.length).toBe(originalLength);
    });
  });

  describe('prepareBackupCodesForStorage and parseStoredBackupCodes', () => {
    test('should prepare codes for storage as JSON', () => {
      const codes = ['ABCD1234', 'WXYZ9876'];
      const stored = prepareBackupCodesForStorage(codes);

      expect(typeof stored).toBe('string');
      expect(() => JSON.parse(stored)).not.toThrow();
    });

    test('should parse stored codes correctly', () => {
      const codes = ['ABCD1234', 'WXYZ9876'];
      const stored = prepareBackupCodesForStorage(codes);
      const parsed = parseStoredBackupCodes(stored);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(codes.length);
    });

    test('should round-trip codes correctly', () => {
      const codes = generateBackupCodes(5);
      const stored = prepareBackupCodesForStorage(codes);
      const parsed = parseStoredBackupCodes(stored);

      // Verify a code from original set
      const result = verifyBackupCode(codes[0], parsed);
      expect(result.valid).toBe(true);
    });

    test('should handle empty/null stored codes', () => {
      expect(parseStoredBackupCodes(null)).toEqual([]);
      expect(parseStoredBackupCodes('')).toEqual([]);
      expect(parseStoredBackupCodes('invalid json')).toEqual([]);
    });
  });
});
