// Netlify Function: GET /.netlify/functions/health (service health & DB probe)
const { database, initializeDatabase } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');

let dbInitialized = false;
exports.handler = withHandler(async (event) => {
  const start = Date.now();
  try {
    // Connect and initialize database (once per cold start)
    if (!dbInitialized) {
      await database.connect();
      try { await initializeDatabase(); } catch (e) { /* tables may already exist */ }
      dbInitialized = true;
    }

    let dbOk = false; const dbDriver = process.env.DB_TYPE || 'sqlite';
    try {
      const row = await database.get('SELECT 1 as ok');
      dbOk = !!row;
    } catch (_) { dbOk = false; }

    return ok({
      status: 'ok',
      time: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      db: { ok: dbOk, driver: dbDriver },
      version: process.env.GIT_COMMIT || 'dev',
      latencyMs: Date.now() - start
    });
  } catch (e) {
    return error(500, 'Health check failed', { latencyMs: Date.now() - start });
  }
});
