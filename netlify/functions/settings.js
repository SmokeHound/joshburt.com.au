// Netlify Function: Site Settings CRUD /.netlify/functions/settings
const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');

exports.handler = withHandler(async function(event){
  await database.connect();
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
    await database.run('INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;', [data]);
    return ok({ message: 'Settings updated' });
  }
});
