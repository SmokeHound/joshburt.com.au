// Netlify Function: Site Settings CRUD /.netlify/functions/settings (legacy /api/settings deprecated)
const { database } = require('../../config/database');

exports.handler = async function(event, context) {
  console.log('Settings function called', event.httpMethod);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await database.connect();
    switch (event.httpMethod) {
    case 'GET':
      return await handleGet(event, headers);
    case 'PUT':
      return await handlePut(event, headers);
    default:
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
  } catch (error) {
    console.error('Settings API error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }

  async function handleGet(event, headers) {
    // Single row table: settings (id INTEGER PRIMARY KEY, data TEXT)
    const row = await database.get('SELECT data FROM settings WHERE id = 1');
    return {
      statusCode: 200,
      headers,
      body: row && row.data ? row.data : '{}',
    };
  }

  async function handlePut(event, headers) {
    const data = event.body;
    await database.run('INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;', [data]);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Settings updated' }),
    };
  }
};
