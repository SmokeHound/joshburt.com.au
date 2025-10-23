// Netlify Function: Site Settings CRUD /.netlify/functions/settings
const { database, initializeDatabase } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');

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
    // Upsert settings row id=1 for both SQLite and PostgreSQL
    await database.run('INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;', [data]);
    return ok({ message: 'Settings updated' });
  }
});
