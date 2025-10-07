// Netlify Function: Full CRUD /.netlify/functions/products (legacy /api/products deprecated)
const { database } = require('../../config/database');

exports.handler = async function(event, context) {
  // Always define CORS headers
  // For credentialed requests, cannot use '*', must echo the request origin
  const origin = event.headers && event.headers.origin ? event.headers.origin : '*';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Initialize database connection
    await database.connect();

    switch (event.httpMethod) {
    case 'GET':
      return await handleGet(event, headers);
    case 'POST':
      return await handlePost(event, headers);
    case 'PUT':
      return await handlePut(event, headers);
    case 'DELETE':
      return await handleDelete(event, headers);
    default:
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database operation failed', message: error.message }),
    };
  }

  async function handleGet(event, headers) {
    try {
      let query = 'SELECT * FROM products ORDER BY name';
      let params = [];
      // Optional filter by type
      if (event.queryStringParameters && event.queryStringParameters.type) {
        query = 'SELECT * FROM products WHERE type = ? ORDER BY name';
        params = [event.queryStringParameters.type];
      }
      const products = await database.all(query, params);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(products),
      };
    } catch (error) {
      console.error('GET error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch products' }),
      };
    }
  }

  async function handlePost(event, headers) {
    try {
      const body = JSON.parse(event.body);
      const { name, code, type, specs, description, image } = body;
      if (!name || !code || !type) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: name, code, type' }),
        };
      }
      const query = `
        INSERT INTO products (name, code, type, specs, description, image)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const params = [name, code, type, specs || '', description || '', image || ''];
      const result = await database.run(query, params);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          id: result.id, 
          message: 'Product created successfully',
          product: { id: result.id, name, code, type, specs, description, image }
        }),
      };
    } catch (error) {
      console.error('POST error:', error);
      if (error.message.includes('UNIQUE constraint')) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Product code already exists' }),
        };
      }
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create product' }),
      };
    }
  }

  async function handlePut(event, headers) {
    try {
      const body = JSON.parse(event.body);
      const { id, name, code, type, specs, description, image } = body;
      if (!id || !name || !code || !type) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: id, name, code, type' }),
        };
      }
      const query = `
        UPDATE products 
        SET name = ?, code = ?, type = ?, specs = ?, description = ?, image = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const params = [name, code, type, specs || '', description || '', image || '', id];
      const result = await database.run(query, params);
      if (result.changes === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Product not found' }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'Product updated successfully',
          product: { id, name, code, type, specs, description, image }
        }),
      };
    } catch (error) {
      console.error('PUT error:', error);
      if (error.message.includes('UNIQUE constraint')) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Product code already exists' }),
        };
      }
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update product' }),
      };
    }
  }

  async function handleDelete(event, headers) {
    try {
      const { id } = JSON.parse(event.body);
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required field: id' }),
        };
      }
      const result = await database.run('DELETE FROM products WHERE id = ?', [id]);
      if (result.changes === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Product not found' }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Product deleted successfully' }),
      };
    } catch (error) {
      console.error('DELETE error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete product' }),
      };
    }
  }
};