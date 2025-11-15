#!/usr/bin/env node
/**
 * Health check script for local Netlify Functions
 * Verifies database connectivity and basic API availability
 */

const http = require('http');

const NETLIFY_DEV_URL = process.env.NETLIFY_DEV_URL || 'http://localhost:8888';
const TIMEOUT = 5000;

function checkEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = `${NETLIFY_DEV_URL}${path}`;
    console.log(`🔍 Checking ${url}...`);

    const req = http.get(url, { timeout: TIMEOUT }, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ ${path} - OK (${res.statusCode})`);
          resolve({ path, status: res.statusCode, ok: true });
        } else {
          console.log(`⚠️  ${path} - ${res.statusCode}`);
          resolve({ path, status: res.statusCode, ok: false });
        }
      });
    });

    req.on('error', err => {
      console.log(`❌ ${path} - ${err.message}`);
      reject({ path, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`⏱️  ${path} - Timeout`);
      reject({ path, error: 'Timeout' });
    });
  });
}

async function runHealthCheck() {
  console.log('🏥 Running health check for Netlify Functions...\n');

  const endpoints = ['/.netlify/functions/health', '/.netlify/functions/public-config'];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const result = await checkEndpoint(endpoint);
      results.push(result);
    } catch (error) {
      results.push(error);
    }
  }

  console.log('\n📊 Health Check Summary:');
  const healthy = results.filter(r => r.ok).length;
  const total = results.length;
  console.log(`${healthy}/${total} endpoints healthy`);

  if (healthy === total) {
    console.log('🎉 All systems operational!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some endpoints are unhealthy. Make sure Netlify dev is running.\n');
    console.log('Start it with: npm run dev:functions\n');
    process.exit(1);
  }
}

runHealthCheck().catch(err => {
  console.error('💥 Health check failed:', err);
  process.exit(1);
});
