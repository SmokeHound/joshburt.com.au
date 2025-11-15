// Unit tests for utils/password.js
const {
  validatePassword,
  getPasswordRequirements,
  PASSWORD_MIN_LENGTH
} = require('../../utils/password');

describe('Password Validation Utilities', () => {
  describe('validatePassword', () => {
    test('should reject null or undefined password', () => {
      expect(validatePassword(null).valid).toBe(false);
      expect(validatePassword(undefined).valid).toBe(false);
      expect(validatePassword(null).errors).toContain('Password is required');
    });

    test('should reject non-string password', () => {
      expect(validatePassword(123).valid).toBe(false);
      expect(validatePassword({}).valid).toBe(false);
      expect(validatePassword([]).valid).toBe(false);
    });

    test('should reject password shorter than minimum length', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should reject password without uppercase letter', () => {
      const result = validatePassword('password123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    test('should reject password without lowercase letter', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    test('should reject password without number', () => {
      const result = validatePassword('Password!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should reject password without special character', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)'
      );
    });

    test('should accept valid password with all requirements', () => {
      const result = validatePassword('Password123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept password with minimum length and all character types', () => {
      const result = validatePassword('Pass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept password with various special characters', () => {
      const specialChars = '!@#$%^&*(),.?":{}|<>';
      for (const char of specialChars) {
        const password = `Password123${char}`;
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
      }
    });

    test('should return multiple errors for password with multiple issues', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    test('should handle edge case with exactly minimum length', () => {
      const result = validatePassword('Pass12!@');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getPasswordRequirements', () => {
    test('should return a string describing password requirements', () => {
      const requirements = getPasswordRequirements();
      expect(typeof requirements).toBe('string');
      expect(requirements).toContain('8 characters');
      expect(requirements).toContain('uppercase');
      expect(requirements).toContain('lowercase');
      expect(requirements).toContain('number');
      expect(requirements).toContain('special character');
    });

    test('should include PASSWORD_MIN_LENGTH value', () => {
      const requirements = getPasswordRequirements();
      expect(requirements).toContain(PASSWORD_MIN_LENGTH.toString());
    });
  });

  describe('PASSWORD_MIN_LENGTH constant', () => {
    test('should be defined and equal to 8', () => {
      expect(PASSWORD_MIN_LENGTH).toBeDefined();
      expect(PASSWORD_MIN_LENGTH).toBe(8);
    });
  });
});
