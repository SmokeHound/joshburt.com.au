
// Netlify Function: GET/POST/PATCH /.netlify/functions/orders
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requirePermission, requireAuth } = require('../../utils/http');
const { hasPermission } = require('../../utils/rbac');
const cache = require('../../utils/cache');

exports.handler = withHandler(async function(event){
  await database.connect();
  const method = event.httpMethod;
  
  try {
    if (method === 'GET') {
      // Only admins and managers can list all orders
      const { user, response: authResponse } = await requirePermission(event, 'orders', 'list');
      if (authResponse) return authResponse;
      
      // Check cache first (1 minute TTL for orders list)
      const cached = cache.get('orders', 'list');
      if (cached) {
        return ok(cached, 200, { 'X-Cache': 'HIT' });
      }
      
      // Optimized query to avoid N+1 - fetch orders and items in one go
      const orders = await database.all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
      
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        // Use IN clause to fetch all items at once instead of N queries
        const placeholders = orderIds.map(() => '?').join(',');
        const allItems = await database.all(
          `SELECT order_id, product_name AS name, product_code AS code, quantity 
           FROM order_items 
           WHERE order_id IN (${placeholders})`,
          orderIds
        );
        
        // Group items by order_id
        const itemsByOrderId = {};
        allItems.forEach(item => {
          if (!itemsByOrderId[item.order_id]) {
            itemsByOrderId[item.order_id] = [];
          }
          itemsByOrderId[item.order_id].push({
            name: item.name,
            code: item.code,
            quantity: item.quantity
          });
        });
        
        // Attach items to orders
        orders.forEach(order => {
          order.items = itemsByOrderId[order.id] || [];
        });
      }
      
      // Cache for 1 minute (60 seconds)
      cache.set('orders', 'list', orders, 60);
      
      return ok(orders, 200, { 'X-Cache': 'MISS' });
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
      
      // Invalidate orders cache on update
      cache.del('orders', 'list');
      
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
      
      // Invalidate orders cache on create
      cache.del('orders', 'list');
      
      return ok({ orderId }, 201);
    }
    
    return error(405, 'Method Not Allowed');
  } catch (e) {
    console.error('Orders function error:', e);
    return error(500, 'Failed to process order', { message: e.message });
  }
});
