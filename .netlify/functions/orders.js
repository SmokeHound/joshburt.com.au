
// Netlify Function: GET and POST /api/orders
const { Client } = require('pg');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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
      // Get orders with basic info (optionally include items)
      const ordersRes = await client.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
      const orders = ordersRes.rows;

      // For each order, get its items
      for (const order of orders) {
        const itemsRes = await client.query(
          'SELECT product_name AS name, product_code AS code, quantity FROM order_items WHERE order_id = $1',
          [order.id]
        );
        order.items = itemsRes.rows;
      }

      await client.end();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(orders),
      };
    }

    if (event.httpMethod === 'POST') {
      if (event.httpMethod === 'PATCH') {
      // Update order status (approve/reject)
        const { orderId, status } = JSON.parse(event.body || '{}');
        if (!orderId || !['approved', 'rejected'].includes(status)) {
          await client.end();
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing or invalid orderId/status' }),
          };
        }
        const updateRes = await client.query(
          'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [status, orderId]
        );
        await client.end();
        if (updateRes.rowCount === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' }),
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, order: updateRes.rows[0] }),
        };
      }
      const orderData = JSON.parse(event.body);
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        await client.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Order must contain at least one item' }),
        };
      }

      // Insert order
      const orderRes = await client.query(
        'INSERT INTO orders (created_by, total_items, status) VALUES ($1, $2, $3) RETURNING id',
        [orderData.requestedBy || 'mechanic', orderData.items.length, 'pending']
      );
      const orderId = orderRes.rows[0].id;

      // Insert order items
      for (const item of orderData.items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_name, product_code, quantity) VALUES ($1, $2, $3, $4)',
          [orderId, item.name, item.code, item.quantity]
        );
      }

      await client.end();
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ orderId }),
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
      body: JSON.stringify({ error: 'Failed to process order', message: error.message }),
    };
  }
};
