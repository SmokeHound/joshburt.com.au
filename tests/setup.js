// Test setup file

// Add TextEncoder and TextDecoder for pg library
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock localStorage
// Mock localStorage (override JSDOM's Storage with Jest mocks and a backing store)
let __lsStore = {};
const localStorageMock = {
  getItem: jest.fn(key => (key in __lsStore ? __lsStore[key] : null)),
  setItem: jest.fn((key, value) => {
    __lsStore[key] = String(value);
  }),
  removeItem: jest.fn(key => {
    delete __lsStore[key];
  }),
  clear: jest.fn(() => {
    __lsStore = {};
  })
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
}

beforeEach(() => {
  __lsStore = {};
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve('<div>mock html</div>')
  })
);

// Mock console methods to reduce noise in tests
global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Add custom matchers
expect.extend({
  toHaveValidHTML(received) {
    const pass =
      received.includes('<!DOCTYPE html>') &&
      received.includes('<html') &&
      received.includes('</html>');
    if (pass) {
      return {
        message: () => `expected ${received} not to be valid HTML`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be valid HTML`,
        pass: false
      };
    }
  }
});
