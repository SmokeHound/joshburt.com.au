// Netlify Function: Site Settings CRUD /.netlify/functions/settings
const { database, initializeDatabase } = require('../../config/database');
const { withHandler, ok, error, requireAuth } = require('../../utils/fn');
const { logAudit } = require('../../utils/audit');

let dbReady = false;
async function ensureDb(){
  if (!dbReady) { await initializeDatabase(); dbReady = true; }
}

exports.handler = withHandler(async function(event){
  await ensureDb();
  const method = event.httpMethod;
  if (method === 'GET') return handleGet();
  if (method === 'PUT') return handlePut(event);
  return error(405, 'Method Not Allowed');

  async function handleGet() {
    // Single row table: settings (id INTEGER PRIMARY KEY, data TEXT)
    const row = await database.get('SELECT data FROM settings WHERE id = 1');
    // If no row, return empty object
    const data = row && row.data ? row.data : '{}';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...require('../../utils/http').corsHeaders },
      body: data,
    };
  }

  async function handlePut(event) {
    const data = event.body || '{}';
    // Try to attach user context (admin preferred), but do not block if unauthenticated to avoid breaking callers
    let userId = null;
    try {
      const { user } = await requireAuth(event, ['admin']);
      if (user) userId = user.id;
    } catch (_) { /* non-fatal */ }

    // Upsert settings row id=1 for both SQLite and PostgreSQL, with robust fallback if legacy schemas are missing columns
    try {
      await database.run('INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;', [data]);
    } catch (e) {
      // Attempt to backfill missing updated_at column, then retry
      const isPg = (database && (database.type === 'postgres' || database.type === 'postgresql'));
      try {
        if (isPg) {
          await database.run('ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        } else {
          try { await database.run('ALTER TABLE settings ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch (_) { /* ignore duplicate */ }
        }
      } catch(_) { /* ignore backfill errors */ }
      try {
        await database.run('INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;', [data]);
      } catch (e2) {
        // Final fallback: upsert without touching updated_at to avoid breaking callers
        try {
          if (isPg) {
            await database.run('INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;', [data]);
          } else {
            await database.run('INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data;', [data]);
          }
        } catch (e3) {
          return error(500, 'Failed to save settings');
        }
      }
    }
    // Audit
    await logAudit(event, { action: 'settings.update', userId, details: { size: data.length } });
    return ok({ message: 'Settings updated' });
  }
});
