// Netlify Function: products.js
// Handles Castrol product data from Neon DB

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_RCwEhZ2pm6vx@ep-broad-term-a75jcieo-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

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
    if (event.httpMethod === 'GET') {
      // Get products, optionally filtered by type
      const urlParams = new URLSearchParams(event.queryStringParameters || {});
      const type = urlParams.get('type');
      
      let query = 'SELECT * FROM products ORDER BY name';
      let params = [];
      
      if (type) {
        query = 'SELECT * FROM products WHERE type = $1 ORDER BY name';
        params = [type];
      }
      
      const result = await pool.query(query, params);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
      
    } else if (event.httpMethod === 'POST') {
      // Add new product (admin functionality)
      const product = JSON.parse(event.body);
      
      // Validate required fields
      if (!product.name || !product.code || !product.type) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: name, code, type' })
        };
      }
      
      const result = await pool.query(
        'INSERT INTO products (name, code, type, specs, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [product.name, product.code, product.type, product.specs || '', product.description || '']
      );
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, productId: result.rows[0].id })
      };
    }
    
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
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