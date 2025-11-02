/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  // Keep Node-only smoke tests outside Jest; they run via npm scripts
  testPathIgnorePatterns: ['/node_modules/', '/tests/functions/', '/tests/auth.test.js']
};
