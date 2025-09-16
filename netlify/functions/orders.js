// Netlify Function: orders.js
// Connects to Neon DB and handles order requests

const { database } = require('../../config/database');

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
      const orderData = JSON.parse(event.body);
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Order must contain at least one item' })
        };
      }
      // Insert order and order items
      const conn = database;
      try {
        // Create order
        const orderResult = await conn.run(
          'INSERT INTO orders (customer_email, total_items, created_at) VALUES (?, ?, NOW())',
          [orderData.customer_email || 'anonymous@example.com', orderData.items.length]
        );
        const orderId = orderResult.id;
        // Insert order items
        for (const item of orderData.items) {
          await conn.run(
            'INSERT INTO order_items (order_id, product_name, product_code, quantity) VALUES (?, ?, ?, ?)',
            [orderId, item.name, item.code, item.quantity]
          );
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, orderId: orderId })
        };
      } catch (err) {
        throw err;
      }
    } else if (event.httpMethod === 'GET') {
      // List orders with items
      const orders = await database.all(
        `SELECT o.id, o.customer_email, o.total_items, o.created_at,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', oi.product_name, 'code', oi.product_code, 'quantity', oi.quantity))
                 FROM order_items oi WHERE oi.order_id = o.id) as items
         FROM orders o
         ORDER BY o.created_at DESC
         LIMIT 50`
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(orders)
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
