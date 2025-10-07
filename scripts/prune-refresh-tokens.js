#!/usr/bin/env node
/**
 * Maintenance script: remove expired refresh tokens.
 * Usage:
 *   DB_TYPE=sqlite node scripts/prune-refresh-tokens.js
 *   DB_TYPE=postgres DB_* env vars set accordingly, etc.
 */
require('dotenv').config();
const { database, initializeDatabase } = require('../config/database');

(async () => {
  try {
    await initializeDatabase();
    // Delete tokens where expires_at < now
    const driver = database.type;
    let sql;
    if (driver === 'mysql') {
      sql = 'DELETE FROM refresh_tokens WHERE expires_at < NOW()';
    } else if (driver === 'postgres' || driver === 'postgresql') {
      sql = 'DELETE FROM refresh_tokens WHERE expires_at < NOW()';
    } else {
      // SQLite
      sql = 'DELETE FROM refresh_tokens WHERE datetime(expires_at) < datetime(\'now\')';
    }
    const before = await database.all('SELECT id FROM refresh_tokens');
    await database.run(sql);
    const after = await database.all('SELECT id FROM refresh_tokens');
    const removed = (before.length - after.length);
    console.log(`🧹 Removed ${removed} expired refresh token(s).`);
    process.exit(0);
  } catch (e) {
    console.error('Failed to prune refresh tokens', e);
    process.exit(1);
  }
})();
