// Netlify Function: Notifications CRUD
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requireAuth } = require('../../utils/http');
const { hasPermission } = require('../../utils/rbac');

exports.handler = withHandler(async function (event) {
  await database.connect();

  const method = event.httpMethod;
  if (method === 'GET') return handleGet(event);
  if (method === 'POST') return handlePost(event);
  if (method === 'PATCH') return handlePatch(event);
  if (method === 'DELETE') return handleDelete(event);
  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    // Users can read their own notifications
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    try {
      const params = event.queryStringParameters || {};
      const { unread_only, type, limit = 50 } = params;

      let query = 'SELECT * FROM notifications WHERE user_id = ?';
      const queryParams = [user.id];

      if (unread_only === 'true') {
        query += ' AND is_read = false';
      }

      if (type) {
        query += ' AND type = ?';
        queryParams.push(type);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      queryParams.push(parseInt(limit));

      const notifications = await database.all(query, queryParams);

      // Get unread count
      const unreadResult = await database.get(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false',
        [user.id]
      );

      return ok({
        notifications,
        unread_count: unreadResult.count || 0
      });
    } catch (e) {
      console.error('GET /notifications error:', e);
      return error(500, 'Failed to fetch notifications');
    }
  }

  async function handlePost(event) {
    // Only admins can create system notifications
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    if (!hasPermission(user, 'users', 'update')) {
      return error(403, 'Only admins can create system notifications');
    }

    try {
      const body = parseBody(event);
      const {
        user_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        action_url,
        priority,
        expires_at
      } = body;

      if (!user_id || !type || !title || !message) {
        return error(400, 'Missing required fields: user_id, type, title, message');
      }

      const query = `
        INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id, action_url, priority, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        user_id,
        type,
        title,
        message,
        related_entity_type || null,
        related_entity_id || null,
        action_url || null,
        priority || 'normal',
        expires_at || null
      ];

      const result = await database.run(query, params);

      return ok(
        {
          id: result.id,
          message: 'Notification created successfully'
        },
        201
      );
    } catch (e) {
      console.error('POST /notifications error:', e);
      return error(500, 'Failed to create notification');
    }
  }

  async function handlePatch(event) {
    // Mark notification(s) as read
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    try {
      const body = parseBody(event);
      const { notification_id, mark_all_read } = body;

      if (mark_all_read) {
        // Mark all notifications as read for this user
        await database.run(
          'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = false',
          [user.id]
        );
        return ok({ message: 'All notifications marked as read' });
      }

      if (!notification_id) {
        return error(400, 'Missing notification_id');
      }

      // Mark specific notification as read (must belong to user)
      const result = await database.run(
        'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [notification_id, user.id]
      );

      if (result.changes === 0) {
        return error(404, 'Notification not found or does not belong to you');
      }

      return ok({ message: 'Notification marked as read' });
    } catch (e) {
      console.error('PATCH /notifications error:', e);
      return error(500, 'Failed to update notification');
    }
  }

  async function handleDelete(event) {
    // Delete notification
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    try {
      const body = parseBody(event);
      const { notification_id, delete_all_read } = body;

      if (delete_all_read) {
        // Delete all read notifications for this user
        await database.run('DELETE FROM notifications WHERE user_id = ? AND is_read = true', [
          user.id
        ]);
        return ok({ message: 'All read notifications deleted' });
      }

      if (!notification_id) {
        return error(400, 'Missing notification_id');
      }

      // Delete specific notification (must belong to user)
      const result = await database.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [
        notification_id,
        user.id
      ]);

      if (result.changes === 0) {
        return error(404, 'Notification not found or does not belong to you');
      }

      return ok({ message: 'Notification deleted' });
    } catch (e) {
      console.error('DELETE /notifications error:', e);
      return error(500, 'Failed to delete notification');
    }
  }
});
