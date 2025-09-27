// Netlify Function: GET /api/products// Netlify Function: products.js

const { Client } = require('pg');// Handles Castrol product data from Neon DB



exports.handler = async function(event, context) {const { database } = require('../../config/database');

  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL });

  await client.connect();exports.handler = async function(event, context) {

  const res = await client.query('SELECT * FROM products ORDER BY name');  // Add CORS headers for browser requests

  await client.end();  const headers = {

  return {    'Access-Control-Allow-Origin': '*',

    statusCode: 200,    'Access-Control-Allow-Headers': 'Content-Type',

    body: JSON.stringify(res.rows),    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',

    headers: { 'Content-Type': 'application/json' }    'Content-Type': 'application/json',

  };  };

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
        query = 'SELECT * FROM products WHERE type = ? ORDER BY name';
        params = [type];
      }
      
      const products = await database.all(query, params);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(products)
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
      
      const result = await database.run(
        'INSERT INTO products (name, code, type, specs, description) VALUES (?, ?, ?, ?, ?)',
        [product.name, product.code, product.type, product.specs || '', product.description || '']
      );
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, productId: result.id })
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