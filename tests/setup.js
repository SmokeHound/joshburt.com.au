// Test setup file

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve('<div>mock html</div>'),
  })
);

// Mock console methods to reduce noise in tests
global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Add custom matchers
expect.extend({
  toHaveValidHTML(received) {
    const pass = received.includes('<!DOCTYPE html>') && 
                 received.includes('<html') && 
                 received.includes('</html>');
    if (pass) {
      return {
        message: () => `expected ${received} not to be valid HTML`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be valid HTML`,
        pass: false,
      };
    }
  },
});