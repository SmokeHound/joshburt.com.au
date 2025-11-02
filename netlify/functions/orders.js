
// Netlify Function: GET/POST/PATCH/DELETE /.netlify/functions/orders
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requirePermission, requireAuth } = require('../../utils/http');
const { hasPermission } = require('../../utils/rbac');
const { sendOrderStatusEmail } = require('../../utils/email');
const { logAudit } = require('../../utils/audit');

exports.handler = withHandler(async function(event){
  await database.connect();
  const method = event.httpMethod;
  
  try {
    if (method === 'GET') {
      return handleGet(event);
    }
    
    if (method === 'PATCH') {
      return handlePatch(event);
    }
    
    if (method === 'POST') {
      return handlePost(event);
    }

    if (method === 'DELETE') {
      return handleDelete(event);
    }
    
    return error(405, 'Method Not Allowed');
  } catch (e) {
    console.error('Orders function error:', e);
    return error(500, 'Failed to process order', { message: e.message });
  }

  async function handleGet(event) {
    // Only admins and managers can list all orders
    const { user, response: authResponse } = await requirePermission(event, 'orders', 'list');
    if (authResponse) return authResponse;
    
    const params = event.queryStringParameters || {};
    const { status, created_by, export_format, date_from, date_to } = params;

    // Handle CSV export
    if (export_format === 'csv') {
      return await exportOrdersCSV(status, created_by, date_from, date_to);
    }

    let query = 'SELECT * FROM orders WHERE 1=1';
    const queryParams = [];

    if (status) {
      query += ' AND status = ?';
      queryParams.push(status);
    }

    if (created_by) {
      query += ' AND created_by = ?';
      queryParams.push(created_by);
    }

    if (date_from) {
      query += ' AND created_at >= ?';
      queryParams.push(date_from);
    }

    if (date_to) {
      query += ' AND created_at <= ?';
      queryParams.push(date_to);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const orders = await database.all(query, queryParams);
    
    for (const order of orders) {
      const items = await database.all(
        'SELECT product_name AS name, product_code AS code, quantity FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;

      // Get status history
      const history = await database.all(
        'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC',
        [order.id]
      );
      order.status_history = history;
    }
    
    return ok(orders);
  }

  async function handlePatch(event) {
    // Only admins and managers can update orders
    const { user, response: authResponse } = await requirePermission(event, 'orders', 'approve');
    if (authResponse) return authResponse;
    
    const body = parseBody(event);
    const { orderId, status, notes, tracking_number, estimated_delivery } = body;
    
    // Valid statuses: pending, processing, requested, received, approved, rejected, cancelled
    const validStatuses = ['pending', 'processing', 'requested', 'received', 'approved', 'rejected', 'cancelled'];
    
    if (!orderId) {
      return error(400, 'Missing orderId');
    }

    if (status && !validStatuses.includes(status)) {
      return error(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Get current order
    const currentOrder = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!currentOrder) {
      return error(404, 'Order not found');
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
      updates.push('status_updated_at = CURRENT_TIMESTAMP');
    }

    if (tracking_number !== undefined) {
      updates.push('tracking_number = ?');
      params.push(tracking_number);
    }

    if (estimated_delivery !== undefined) {
      updates.push('estimated_delivery = ?');
      params.push(estimated_delivery);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(orderId);

    const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`;
    const result = await database.run(query, params);

    if (result.changes === 0) {
      return error(404, 'Order not found');
    }

    // Record status change in history if status was updated
    if (status && status !== currentOrder.status) {
      await database.run(
        'INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
        [orderId, currentOrder.status, status, user.id || null, notes || null]
      );

      // Log order status change
      await logAudit(event, {
        action: 'order.update_status',
        userId: user.id,
        details: {
          orderId,
          oldStatus: currentOrder.status,
          newStatus: status,
          notes,
          trackingNumber: tracking_number,
          estimatedDelivery: estimated_delivery
        }
      });

      // Send email notification (async, don't wait)
      sendOrderStatusNotification(orderId, currentOrder.created_by, status, currentOrder.status).catch(err => {
        console.error('Failed to send order status email:', err);
      });
    }

    const updatedOrder = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    return ok({ success: true, order: updatedOrder });
  }

  async function handlePost(event) {
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

    // Record initial status in history
    await database.run(
      'INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
      [orderId, null, 'pending', user.id || null, 'Order created']
    );

    // Log order creation
    await logAudit(event, {
      action: 'order.create',
      userId: user.id,
      details: {
        orderId,
        totalItems: orderData.items.length,
        priority: orderData.priority || 'normal',
        createdBy
      }
    });

    // Send order created notification
    sendOrderCreatedNotification(orderId, createdBy).catch(err => {
      console.error('Failed to send order created email:', err);
    });
    
    return ok({ orderId, message: 'Order created successfully' }, 201);
  }

  async function handleDelete(event) {
    // Handle order cancellation
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    const body = parseBody(event);
    const { orderId, reason } = body;

    if (!orderId) {
      return error(400, 'Missing orderId');
    }

    // Get order
    const order = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return error(404, 'Order not found');
    }

    // Only allow cancellation of pending/processing orders
    if (!['pending', 'processing'].includes(order.status)) {
      return error(400, 'Only pending or processing orders can be cancelled');
    }

    // Users can only cancel their own orders unless they're admin/manager
    if (order.created_by !== user.email && !hasPermission(user, 'orders', 'approve')) {
      return error(403, 'You can only cancel your own orders');
    }

    // Update order to cancelled
    await database.run(
      'UPDATE orders SET status = ?, cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', reason || 'Cancelled by user', orderId]
    );

    // Record in history
    await database.run(
      'INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
      [orderId, order.status, 'cancelled', user.id || null, reason || 'Cancelled by user']
    );

    // Log order cancellation
    await logAudit(event, {
      action: 'order.cancel',
      userId: user.id,
      details: {
        orderId,
        oldStatus: order.status,
        reason: reason || 'Cancelled by user',
        createdBy: order.created_by
      }
    });

    return ok({ message: 'Order cancelled successfully' });
  }

  async function exportOrdersCSV(status, created_by, date_from, date_to) {
    let query = 'SELECT o.*, GROUP_CONCAT(oi.product_name || " x" || oi.quantity) as items FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id WHERE 1=1';
    const queryParams = [];

    if (status) {
      query += ' AND o.status = ?';
      queryParams.push(status);
    }

    if (created_by) {
      query += ' AND o.created_by = ?';
      queryParams.push(created_by);
    }

    if (date_from) {
      query += ' AND o.created_at >= ?';
      queryParams.push(date_from);
    }

    if (date_to) {
      query += ' AND o.created_at <= ?';
      queryParams.push(date_to);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const orders = await database.all(query, queryParams);

    // Generate CSV
    const headers = ['Order ID', 'Created By', 'Status', 'Priority', 'Items', 'Total Items', 'Notes', 'Created At', 'Updated At'];
    const rows = orders.map(o => [
      o.id,
      o.created_by,
      o.status,
      o.priority,
      o.items || '',
      o.total_items,
      o.notes || '',
      o.created_at,
      o.updated_at
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-${Date.now()}.csv"`,
        'Access-Control-Allow-Origin': '*'
      },
      body: csv
    };
  }

  async function sendOrderStatusNotification(orderId, userEmail, newStatus, oldStatus) {
    // Create notification in database
    try {
      const user = await database.get('SELECT id FROM users WHERE email = ?', [userEmail]);
      if (!user) return;

      await database.run(
        `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          'order_status',
          'Order Status Updated',
          `Your order #${orderId} status changed from ${oldStatus} to ${newStatus}`,
          'order',
          orderId,
          `/orders-review.html?order=${orderId}`
        ]
      );

      // Check user preferences for email notifications
      const prefs = await database.get(
        'SELECT email_order_status FROM notification_preferences WHERE user_id = ?',
        [user.id]
      );

      if (prefs && prefs.email_order_status) {
        // Send email using existing email utility (would need to add this function to utils/email.js)
        // For now, just log
        console.log(`Would send email to ${userEmail} about order ${orderId} status change`);
      }
    } catch (err) {
      console.error('Failed to create order status notification:', err);
    }
  }

  async function sendOrderCreatedNotification(orderId, userEmail) {
    try {
      const user = await database.get('SELECT id FROM users WHERE email = ?', [userEmail]);
      if (!user) return;

      await database.run(
        `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          'order_status',
          'Order Created',
          `Your order #${orderId} has been created and is pending review`,
          'order',
          orderId,
          `/orders-review.html?order=${orderId}`
        ]
      );
    } catch (err) {
      console.error('Failed to create order created notification:', err);
    }
  }
});