#!/usr/bin/env node
// Deprecated: legacy Express startup script (no-op).
// This project is 100% serverless (Netlify Functions). Keeping this file
// avoids breaking old docs/scripts, but it intentionally does nothing.

if (require.main === module) {
  console.log('Notice: scripts/start.js is deprecated. Use Netlify Functions (netlify dev) instead.');
  process.exit(0);
}

module.exports = {};