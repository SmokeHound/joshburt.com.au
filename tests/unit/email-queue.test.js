/**
 * Unit Tests for Email Queue
 */

// Mock the database module to avoid pg dependency issues in tests
jest.mock('../../config/database', () => ({
  database: {
    get: jest.fn(),
    run: jest.fn(),
    all: jest.fn()
  }
}));

const { substituteVariables } = require('../../utils/email-queue');

describe('Email Queue', () => {
  describe('substituteVariables', () => {
    it('should substitute single variable', () => {
      const template = 'Hello {{name}}!';
      const data = { name: 'John' };
      
      const result = substituteVariables(template, data);
      
      expect(result).toBe('Hello John!');
    });
    
    it('should substitute multiple variables', () => {
      const template = 'Hello {{name}}, your email is {{email}}';
      const data = { name: 'John', email: 'john@example.com' };
      
      const result = substituteVariables(template, data);
      
      expect(result).toBe('Hello John, your email is john@example.com');
    });
    
    it('should leave unknown variables unchanged', () => {
      const template = 'Hello {{name}}, your id is {{id}}';
      const data = { name: 'John' };
      
      const result = substituteVariables(template, data);
      
      expect(result).toBe('Hello John, your id is {{id}}');
    });
    
    it('should handle empty template', () => {
      const result = substituteVariables('', { name: 'John' });
      
      expect(result).toBe('');
    });
    
    it('should handle null template', () => {
      const result = substituteVariables(null, { name: 'John' });
      
      expect(result).toBe('');
    });
    
    it('should handle template without variables', () => {
      const template = 'Hello world!';
      const data = { name: 'John' };
      
      const result = substituteVariables(template, data);
      
      expect(result).toBe('Hello world!');
    });
    
    it('should handle repeated variables', () => {
      const template = '{{name}} and {{name}} again';
      const data = { name: 'John' };
      
      const result = substituteVariables(template, data);
      
      expect(result).toBe('John and John again');
    });
  });
});
