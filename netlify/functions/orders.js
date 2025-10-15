// Netlify Function: GET/POST/PATCH /.netlify/functions/orders
const { Client } = require('pg');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');

exports.handler = withHandler(async function(event){
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await client.connect();
  const method = event.httpMethod;
  try {
    if (method === 'GET') {
      const ordersRes = await client.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
      const orders = ordersRes.rows;
      for (const order of orders) {
        const itemsRes = await client.query(
          'SELECT product_name AS name, product_code AS code, quantity FROM order_items WHERE order_id = $1',
          [order.id]
        );
        order.items = itemsRes.rows;
      }
      await client.end();
      return ok(orders);
    }
    if (method === 'PATCH') {
      const { orderId, status } = parseBody(event);
      if (!orderId || !['approved', 'rejected'].includes(status)) {
        await client.end();
        return error(400, 'Missing or invalid orderId/status');
      }
      const updateRes = await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, orderId]
      );
      await client.end();
      if (updateRes.rowCount === 0) return error(404, 'Order not found');
      return ok({ success: true, order: updateRes.rows[0] });
    }
    if (method === 'POST') {
      const orderData = parseBody(event);
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        await client.end();
        return error(400, 'Order must contain at least one item');
      }
      const orderRes = await client.query(
        'INSERT INTO orders (created_by, total_items, status) VALUES ($1, $2, $3) RETURNING id',
        [orderData.requestedBy || 'mechanic', orderData.items.length, 'pending']
      );
      const orderId = orderRes.rows[0].id;
      for (const item of orderData.items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_name, product_code, quantity) VALUES ($1, $2, $3, $4)',
          [orderId, item.name, item.code, item.quantity]
        );
      }
      await client.end();
      return ok({ orderId }, 201);
    }
    await client.end();
    return error(405, 'Method Not Allowed');
  } catch (e) {
    await client.end();
    console.error('Orders function error:', e);
    return error(500, 'Failed to process order', { message: e.message });
  }
});
