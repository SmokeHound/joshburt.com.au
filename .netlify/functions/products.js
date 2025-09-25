const { Client } = require('pg');

exports.handler = async function(event, context) {
  // Add CORS headers for browser requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Make sure NEON_DATABASE_URL is set in Netlify Environment Variables
    if (!process.env.NETLIFY_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL environment variable is not set');
    }

    const client = new Client({
      connectionString: process.env.NETLIFY_DATABASE_URL,
    });

    await client.connect();
    const res = await client.query('SELECT * FROM products ORDER BY id');
    await client.end();

    const products = res.rows;
    console.log('Products loaded from API:', products.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error('Database error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch products', 
        message: error.message 
      }),
    };
  }
};