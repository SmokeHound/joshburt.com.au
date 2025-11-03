/* eslint-disable quotes */
const {
  defineConfig
} = require("eslint/config");

const globals = require("globals");
const js = require("@eslint/js");

const {
  FlatCompat
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = defineConfig([
  { ignores: ['netlify/**'] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
        'localStorage': 'readonly',
        'fetch': 'readonly',
        'tailwind': 'readonly'
      },
      ecmaVersion: 12,
      sourceType: 'script',
      parserOptions: {}
    },
    extends: compat.extends('eslint:recommended'),
    rules: {
      'indent': ['warn', 2],
      'linebreak-style': ['off', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-unused-vars': ['warn', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrors': 'none'
      }],
      'no-console': 'off',
      'no-undef': 'error',
      'consistent-return': 'warn',
      'no-return-await': 'warn',
      'require-await': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['warn', 'always'],
      'curly': ['warn', 'all'],
      'brace-style': ['warn', '1tbs', { 'allowSingleLine': true }],
      'no-trailing-spaces': 'warn',
      'no-multiple-empty-lines': ['warn', { 'max': 2 }],
      'comma-dangle': ['warn', 'never'],
      'arrow-spacing': 'warn',
      'keyword-spacing': 'warn',
      'space-before-blocks': 'warn',
      'object-curly-spacing': ['warn', 'always'],
      'array-bracket-spacing': ['warn', 'never']
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        'expect': 'readonly',
        'describe': 'readonly',
        'test': 'readonly',
        'beforeAll': 'readonly',
        'beforeEach': 'readonly',
        'afterAll': 'readonly',
        'afterEach': 'readonly',
        'jest': 'readonly'
      }
    }
  }
]);
