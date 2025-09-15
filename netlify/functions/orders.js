// Netlify Function: orders.js
// Connects to Neon DB and handles order requests

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
    if (event.httpMethod === 'POST') {
      // Save order with multiple items
      const orderData = JSON.parse(event.body);
      
      // Validate required fields
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Order must contain at least one item' })
        };
      }

      // Insert order and order items
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Create order
        const orderResult = await client.query(
          'INSERT INTO orders (customer_email, total_items, created_at) VALUES ($1, $2, NOW()) RETURNING id',
          [orderData.customer_email || 'anonymous@example.com', orderData.items.length]
        );
        
        const orderId = orderResult.rows[0].id;
        
        // Insert order items
        for (const item of orderData.items) {
          await client.query(
            'INSERT INTO order_items (order_id, product_name, product_code, quantity) VALUES ($1, $2, $3, $4)',
            [orderId, item.name, item.code, item.quantity]
          );
        }
        
        await client.query('COMMIT');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, orderId: orderId })
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      
    } else if (event.httpMethod === 'GET') {
      // List orders with items
      const result = await pool.query(`
        SELECT o.id, o.customer_email, o.total_items, o.created_at,
               json_agg(json_build_object('name', oi.product_name, 'code', oi.product_code, 'quantity', oi.quantity)) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id, o.customer_email, o.total_items, o.created_at
        ORDER BY o.created_at DESC
        LIMIT 50
      `);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
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
        error: 'Failed to process order', 
        message: error.message 
      }),
    };
  }
};
