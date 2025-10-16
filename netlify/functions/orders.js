// Netlify Function: GET/POST/PATCH /.netlify/functions/orders
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { database, initializeDatabase } = require('../../config/database');

let dbReady = false;
async function ensureDb(){
  if (!dbReady) { await initializeDatabase(); dbReady = true; }
}

exports.handler = withHandler(async function(event){
  await ensureDb();
  const method = event.httpMethod;
  try {
    if (method === 'GET') {
      const orders = await database.all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
      for (const order of orders) {
        const items = await database.all(
          'SELECT product_name AS name, product_code AS code, quantity FROM order_items WHERE order_id = ?',
          [order.id]
        );
        order.items = items;
      }
      return ok(orders);
    }
    if (method === 'PATCH') {
      const { orderId, status } = parseBody(event);
      if (!orderId || !['approved', 'rejected'].includes(status)) {
        return error(400, 'Missing or invalid orderId/status');
      }
      const updateRes = await database.run(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, orderId]
      );
      if (!updateRes || updateRes.changes === 0) return error(404, 'Order not found');
      const updated = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);
      return ok({ success: true, order: updated });
    }
    if (method === 'POST') {
      const orderData = parseBody(event);
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return error(400, 'Order must contain at least one item');
      }
      const inserted = await database.run(
        'INSERT INTO orders (customer_email, total_items, status) VALUES (?, ?, ?)',
        [orderData.requestedBy || 'mechanic', orderData.items.length, 'pending']
      );
      const orderId = inserted.id;
      for (const item of orderData.items) {
        await database.run(
          'INSERT INTO order_items (order_id, product_name, product_code, quantity) VALUES (?, ?, ?, ?)',
          [orderId, item.name, item.code, item.quantity]
        );
      }
      return ok({ orderId }, 201);
    }
    return error(405, 'Method Not Allowed');
  } catch (e) {
    console.error('Orders function error:', e);
    return error(500, 'Failed to process order', { message: e.message });
  }
});
