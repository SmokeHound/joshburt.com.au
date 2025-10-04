/* eslint-disable quotes */
const {
  defineConfig,
} = require("eslint/config");

const globals = require("globals");
const js = require("@eslint/js");

const {
  FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = defineConfig([{
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.jest,
      ...globals.node,
      "localStorage": "readonly",
      "fetch": "readonly",
      "tailwind": "readonly",
    },

    ecmaVersion: 12,
    sourceType: "script",
    parserOptions: {},
  },

  extends: compat.extends("eslint:recommended"),

  rules: {
    "indent": ["error", 2],
    "linebreak-style": ["off", "unix"],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-unused-vars": ["off"],
    "no-console": "off",
    "no-undef": "error",
  },
}, {
  files: ["tests/**/*.js"],

  languageOptions: {
    globals: {
      ...globals.jest,
      "expect": "readonly",
      "describe": "readonly",
      "test": "readonly",
      "beforeAll": "readonly",
      "beforeEach": "readonly",
      "afterAll": "readonly",
      "afterEach": "readonly",
      "jest": "readonly",
    },
  },
}]);