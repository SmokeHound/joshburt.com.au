const { Client } = require('pg');

exports.handler = async function(event, context) {
  // Make sure NEON_DATABASE_URL is set in Netlify Environment Variables
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  await client.connect();
  const res = await client.query('SELECT * FROM products');
  await client.end();

  return {
    statusCode: 200,
    body: JSON.stringify(res.rows),
  };
};