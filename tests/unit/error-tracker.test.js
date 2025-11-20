/**
 * Unit Tests for Error Tracker
 */

// Mock the database module to avoid pg dependency issues in tests
jest.mock('../../config/database', () => ({
  database: {
    get: jest.fn(),
    run: jest.fn(),
    all: jest.fn()
  }
}));

const { generateFingerprint, extractStackTrace } = require('../../utils/error-tracker');

describe('Error Tracker', () => {
  describe('generateFingerprint', () => {
    it('should generate consistent fingerprints for same error', () => {
      const error1 = { name: 'Error', message: 'Test error' };
      const error2 = { name: 'Error', message: 'Test error' };
      const url = '/test-page';

      const fp1 = generateFingerprint(error1, url);
      const fp2 = generateFingerprint(error2, url);

      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprints for different errors', () => {
      const error1 = { name: 'Error', message: 'Test error 1' };
      const error2 = { name: 'Error', message: 'Test error 2' };
      const url = '/test-page';

      const fp1 = generateFingerprint(error1, url);
      const fp2 = generateFingerprint(error2, url);

      expect(fp1).not.toBe(fp2);
    });

    it('should generate different fingerprints for different URLs', () => {
      const error = { name: 'Error', message: 'Test error' };

      const fp1 = generateFingerprint(error, '/page1');
      const fp2 = generateFingerprint(error, '/page2');

      expect(fp1).not.toBe(fp2);
    });

    it('should handle errors without name', () => {
      const error = { message: 'Test error' };
      const url = '/test-page';

      const fp = generateFingerprint(error, url);

      expect(fp).toBeTruthy();
      expect(fp.length).toBe(64);
    });

    it('should handle missing URL', () => {
      const error = { name: 'Error', message: 'Test error' };

      const fp = generateFingerprint(error);

      expect(fp).toBeTruthy();
      expect(fp.length).toBe(64);
    });
  });

  describe('extractStackTrace', () => {
    it('should extract stack trace from error', () => {
      const error = new Error('Test error');

      const stack = extractStackTrace(error);

      expect(stack).toBeTruthy();
      expect(stack).toContain('Error: Test error');
    });

    it('should return null for error without stack', () => {
      const error = { message: 'Test error' };

      const stack = extractStackTrace(error);

      expect(stack).toBeNull();
    });

    it('should limit stack trace length', () => {
      const error = new Error('Test error');
      // Create a very long stack
      error.stack = 'x'.repeat(20000);

      const stack = extractStackTrace(error);

      expect(stack.length).toBeLessThanOrEqual(10000);
    });
  });
});
