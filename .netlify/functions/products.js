// Netlify Function: GET /api/products
const { Client } = require('pg');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await client.connect();

  try {
    if (event.httpMethod === 'GET') {
      // Optional filter by type
      let query = 'SELECT * FROM products ORDER BY name';
      let params = [];
      if (event.queryStringParameters && event.queryStringParameters.type) {
        query = 'SELECT * FROM products WHERE type = $1 ORDER BY name';
        params = [event.queryStringParameters.type];
      }
      const res = await client.query(query, params);
      await client.end();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(res.rows),
      };
    }

    await client.end();
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  } catch (error) {
    await client.end();
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch products', message: error.message }),
    };
  }
};