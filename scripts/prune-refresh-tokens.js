// Prune expired refresh tokens from the database (PostgreSQL)
// Safe to run repeatedly; prints deleted row count.

const { database, initializeDatabase } = require('../config/database');

(async function main() {
  try {
    await database.connect();
    // Ensure tables exist in case this is run early
    try {
      await initializeDatabase();
    } catch (err) {
      /* tables may already exist */
    }

    // Use ISO timestamp to compare with PostgreSQL TIMESTAMP columns
    const nowIso = new Date().toISOString();
    const res = await database.run('DELETE FROM refresh_tokens WHERE expires_at <= ?', [nowIso]);
    const deleted = res && (res.changes || 0);
    console.log(`Pruned ${deleted} expired refresh token(s).`);
    await database.close();
    process.exit(0);
  } catch (e) {
    console.error('Prune failed:', e.message);
    try {
      await database.close();
    } catch (err) {
      /* ignore close errors */
    }
    process.exit(1);
  }
})();
