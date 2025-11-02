// Unit tests for input sanitization utilities
const { sanitizeString, isValidEmail, isValidURL, isValidInteger, validateObject, isSQLSafe, sanitizeFilename } = require('../../utils/sanitize');

describe('Input Sanitization Utilities', () => {
  describe('sanitizeString', () => {
    test('should trim whitespace by default', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    test('should remove null bytes', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
    });

    test('should limit string length', () => {
      const result = sanitizeString('hello world', { maxLength: 5 });
      expect(result).toBe('hello');
    });

    test('should escape HTML when specified', () => {
      const result = sanitizeString('<script>alert("xss")</script>', { escapeHtml: true });
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    test('should strip HTML tags when specified', () => {
      const result = sanitizeString('<p>Hello <b>world</b></p>', { stripHtml: true });
      expect(result).toBe('Hello world');
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user space@example.com')).toBe(false);
    });

    test('should reject non-string inputs', () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
      expect(isValidEmail(123)).toBe(false);
    });
  });

  describe('isValidURL', () => {
    test('should validate correct URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://example.com/path')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(isValidURL('not a url')).toBe(false);
      expect(isValidURL('ftp://example.com')).toBe(false);
    });

    test('should respect allowed protocols', () => {
      const url = 'ftp://example.com';
      expect(isValidURL(url, { allowedProtocols: ['ftp:'] })).toBe(true);
      expect(isValidURL(url, { allowedProtocols: ['http:', 'https:'] })).toBe(false);
    });
  });

  describe('isValidInteger', () => {
    test('should validate integers', () => {
      expect(isValidInteger(42)).toBe(true);
      expect(isValidInteger('42')).toBe(true);
      expect(isValidInteger(0)).toBe(true);
    });

    test('should reject non-integers', () => {
      expect(isValidInteger(3.14)).toBe(false);
      expect(isValidInteger('not a number')).toBe(false);
      expect(isValidInteger(NaN)).toBe(false);
    });

    test('should respect min/max bounds', () => {
      expect(isValidInteger(5, { min: 0, max: 10 })).toBe(true);
      expect(isValidInteger(-1, { min: 0 })).toBe(false);
      expect(isValidInteger(11, { max: 10 })).toBe(false);
    });
  });

  describe('validateObject', () => {
    test('should validate object against schema', () => {
      const schema = {
        name: { type: 'string', required: true, minLength: 2 },
        age: { type: 'integer', required: true, min: 0 },
        email: { type: 'email', required: true }
      };

      const input = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };

      const result = validateObject(input, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data.name).toBe('John Doe');
    });

    test('should catch missing required fields', () => {
      const schema = {
        name: { type: 'string', required: true }
      };

      const result = validateObject({}, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should sanitize string fields', () => {
      const schema = {
        name: { type: 'string', required: true, sanitize: { trim: true } }
      };

      const result = validateObject({ name: '  John  ' }, schema);
      expect(result.valid).toBe(true);
      expect(result.data.name).toBe('John');
    });
  });

  describe('isSQLSafe', () => {
    test('should detect SQL keywords', () => {
      expect(isSQLSafe('SELECT * FROM users')).toBe(false);
      expect(isSQLSafe('DROP TABLE users')).toBe(false);
      expect(isSQLSafe('INSERT INTO users')).toBe(false);
    });

    test('should allow safe strings', () => {
      expect(isSQLSafe('John Doe')).toBe(true);
      expect(isSQLSafe('user@example.com')).toBe(true);
    });

    test('should detect SQL injection patterns', () => {
      expect(isSQLSafe('\' OR \'1\'=\'1')).toBe(false);
      expect(isSQLSafe('admin--')).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    test('should remove directory traversal patterns', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
      expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('windowssystem32');
    });

    test('should allow safe filenames', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf');
      expect(sanitizeFilename('my-file_v2.txt')).toBe('my-file_v2.txt');
    });

    test('should remove path separators', () => {
      expect(sanitizeFilename('path/to/file.txt')).toBe('pathtofile.txt');
      expect(sanitizeFilename('path\\to\\file.txt')).toBe('pathtofile.txt');
    });

    test('should remove special characters', () => {
      expect(sanitizeFilename('file<>:|?.txt')).toBe('file.txt');
    });
  });
});
