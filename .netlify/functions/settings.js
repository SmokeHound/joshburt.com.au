// Netlify Function: Site Settings CRUD
const { database } = require('../../config/database');

exports.handler = async function(event, context) {
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
    await database.run('INSERT OR REPLACE INTO settings (id, data) VALUES (1, ?)', [data]);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Settings updated' }),
    };
  }
};
