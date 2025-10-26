
// Netlify Function: GET/POST/PATCH /.netlify/functions/orders
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requirePermission, requireAuth } = require('../../utils/http');
const { hasPermission } = require('../../utils/rbac');

exports.handler = withHandler(async function(event){
  await database.connect();
  const method = event.httpMethod;
  
  try {
    if (method === 'GET') {
      // Only admins and managers can list all orders
      const { user, response: authResponse } = await requirePermission(event, 'orders', 'list');
      if (authResponse) return authResponse;
      
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
      // Only admins and managers can approve/reject orders
      const { user, response: authResponse } = await requirePermission(event, 'orders', 'approve');
      if (authResponse) return authResponse;
      
      const { orderId, status } = parseBody(event);
      if (!orderId || !['approved', 'rejected'].includes(status)) {
        return error(400, 'Missing or invalid orderId/status');
      }
      const result = await database.run(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, orderId]
      );
      if (result.changes === 0) return error(404, 'Order not found');
      const updatedOrder = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);
      return ok({ success: true, order: updatedOrder });
    }
    
    if (method === 'POST') {
      // All authenticated users can create orders
      const { user, response: authResponse } = await requirePermission(event, 'orders', 'create');
      if (authResponse) return authResponse;
      
      const orderData = parseBody(event);
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return error(400, 'Order must contain at least one item');
      }
      
      // Use the authenticated user's email as the creator
      const createdBy = user.email || orderData.requestedBy || 'unknown';
      
      const orderResult = await database.run(
        'INSERT INTO orders (created_by, total_items, status, priority, notes) VALUES (?, ?, ?, ?, ?)',
        [createdBy, orderData.items.length, 'pending', orderData.priority || 'normal', orderData.notes || null]
      );
      const orderId = orderResult.id;
      
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
