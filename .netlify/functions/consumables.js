// Netlify Function: GET /api/consumables
const { Client } = require('pg');

exports.handler = async function(event, context) {
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT * FROM consumables ORDER BY name');
  await client.end();
  return {
    statusCode: 200,
    body: JSON.stringify(res.rows),
    headers: { 'Content-Type': 'application/json' }
  };
};