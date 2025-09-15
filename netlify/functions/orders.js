// Netlify Function: orders.js
// Connects to Neon DB and handles order requests

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RCwEhZ2pm6vx@ep-broad-term-a75jcieo-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

exports.handler = async function(event, context) {
  if (event.httpMethod === 'POST') {
    // Example: Save order
    const order = JSON.parse(event.body);
    try {
      const result = await pool.query(
        'INSERT INTO orders (product_id, quantity, customer_email) VALUES ($1, $2, $3) RETURNING id',
        [order.product_id, order.quantity, order.customer_email]
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, orderId: result.rows[0].id })
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message })
      };
    }
  } else if (event.httpMethod === 'GET') {
    // Example: List orders
    try {
      const result = await pool.query('SELECT * FROM orders LIMIT 10');
      return {
        statusCode: 200,
        body: JSON.stringify(result.rows)
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message })
      };
    }
  }
  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};
