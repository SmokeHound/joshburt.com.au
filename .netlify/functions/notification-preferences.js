// Netlify Function: Notification Preferences
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requireAuth } = require('../../utils/http');

exports.handler = withHandler(async function(event) {
  await database.connect();

  const method = event.httpMethod;
  if (method === 'GET') return handleGet(event);
  if (method === 'PUT') return handlePut(event);
  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    // Get user's notification preferences
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    try {
      let preferences = await database.get(
        'SELECT * FROM notification_preferences WHERE user_id = ?',
        [user.id]
      );

      // Create default preferences if they don't exist
      if (!preferences) {
        await database.run(
          'INSERT INTO notification_preferences (user_id) VALUES (?)',
          [user.id]
        );
        preferences = await database.get(
          'SELECT * FROM notification_preferences WHERE user_id = ?',
          [user.id]
        );
      }

      return ok(preferences);
    } catch (e) {
      console.error('GET /notification-preferences error:', e);
      return error(500, 'Failed to fetch notification preferences');
    }
  }

  async function handlePut(event) {
    // Update user's notification preferences
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    try {
      const body = parseBody(event);
      const {
        email_order_status,
        email_system_announcements,
        email_product_updates,
        in_app_order_status,
        in_app_system_announcements,
        in_app_product_updates
      } = body;

      // Check if preferences exist
      const existing = await database.get(
        'SELECT id FROM notification_preferences WHERE user_id = ?',
        [user.id]
      );

      if (existing) {
        // Update existing preferences
        const query = `
          UPDATE notification_preferences 
          SET email_order_status = ?, 
              email_system_announcements = ?, 
              email_product_updates = ?,
              in_app_order_status = ?,
              in_app_system_announcements = ?,
              in_app_product_updates = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `;
        await database.run(query, [
          email_order_status !== undefined ? email_order_status : true,
          email_system_announcements !== undefined ? email_system_announcements : true,
          email_product_updates !== undefined ? email_product_updates : false,
          in_app_order_status !== undefined ? in_app_order_status : true,
          in_app_system_announcements !== undefined ? in_app_system_announcements : true,
          in_app_product_updates !== undefined ? in_app_product_updates : true,
          user.id
        ]);
      } else {
        // Create new preferences
        const query = `
          INSERT INTO notification_preferences 
          (user_id, email_order_status, email_system_announcements, email_product_updates, 
           in_app_order_status, in_app_system_announcements, in_app_product_updates)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await database.run(query, [
          user.id,
          email_order_status !== undefined ? email_order_status : true,
          email_system_announcements !== undefined ? email_system_announcements : true,
          email_product_updates !== undefined ? email_product_updates : false,
          in_app_order_status !== undefined ? in_app_order_status : true,
          in_app_system_announcements !== undefined ? in_app_system_announcements : true,
          in_app_product_updates !== undefined ? in_app_product_updates : true
        ]);
      }

      const updated = await database.get(
        'SELECT * FROM notification_preferences WHERE user_id = ?',
        [user.id]
      );

      return ok({
        message: 'Preferences updated successfully',
        preferences: updated
      });
    } catch (e) {
      console.error('PUT /notification-preferences error:', e);
      return error(500, 'Failed to update notification preferences');
    }
  }
});
