// Netlify Function: Push Notifications Management
// Handles subscription management and sending push notifications

const webpush = require('web-push');
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody } = require('../../utils/fn');
const { requireAuth } = require('../../utils/http');
const { hasPermission } = require('../../utils/rbac');

// Configure web-push with VAPID keys from environment
// Generate keys with: npx web-push generate-vapid-keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@joshburt.com.au',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

exports.handler = withHandler(async function (event) {
  await database.connect();

  const method = event.httpMethod;
  const path = event.path;

  // GET /push-notifications - Get user's subscriptions
  if (method === 'GET' && !path.includes('/send')) {
    return handleGetSubscriptions(event);
  }

  // POST /push-notifications - Subscribe to push notifications
  if (method === 'POST' && !path.includes('/send')) {
    return handleSubscribe(event);
  }

  // DELETE /push-notifications - Unsubscribe from push notifications
  if (method === 'DELETE') {
    return handleUnsubscribe(event);
  }

  // POST /push-notifications/send - Send push notification (admin only)
  if (method === 'POST' && path.includes('/send')) {
    return handleSendNotification(event);
  }

  // GET /push-notifications/vapid-public-key - Get VAPID public key (no auth required)
  if (method === 'GET' && path.includes('/vapid-public-key')) {
    return handleGetVapidKey();
  }

  return error(405, 'Method Not Allowed');

  async function handleGetSubscriptions(event) {
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    try {
      const subscriptions = await database.all(
        'SELECT id, endpoint, created_at, last_used, is_active FROM push_subscriptions WHERE user_id = ? AND is_active = true',
        [user.id]
      );

      return ok({ subscriptions });
    } catch (e) {
      console.error('GET /push-notifications error:', e);
      return error(500, 'Failed to fetch subscriptions');
    }
  }

  async function handleSubscribe(event) {
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    try {
      const body = parseBody(event);
      const { endpoint, keys } = body;

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return error(400, 'Missing required fields: endpoint, keys.p256dh, keys.auth');
      }

      // Get user agent from headers
      const userAgent = event.headers['user-agent'] || '';

      // Check if subscription already exists
      const existing = await database.get(
        'SELECT id, is_active FROM push_subscriptions WHERE endpoint = ?',
        [endpoint]
      );

      if (existing) {
        // Reactivate if inactive
        if (!existing.is_active) {
          await database.run(
            'UPDATE push_subscriptions SET is_active = true, last_used = NOW() WHERE id = ?',
            [existing.id]
          );
        }
        return ok({ message: 'Subscription already exists', subscription_id: existing.id });
      }

      // Create new subscription
      const result = await database.run(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, endpoint, keys.p256dh, keys.auth, userAgent]
      );

      return ok({
        message: 'Successfully subscribed to push notifications',
        subscription_id: result.lastID
      });
    } catch (e) {
      console.error('POST /push-notifications error:', e);
      return error(500, 'Failed to create subscription');
    }
  }

  async function handleUnsubscribe(event) {
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    try {
      const params = event.queryStringParameters || {};
      const { endpoint } = params;

      if (!endpoint) {
        return error(400, 'Missing required parameter: endpoint');
      }

      // Mark subscription as inactive (soft delete)
      const result = await database.run(
        'UPDATE push_subscriptions SET is_active = false WHERE user_id = ? AND endpoint = ?',
        [user.id, endpoint]
      );

      if (result.changes === 0) {
        return error(404, 'Subscription not found');
      }

      return ok({ message: 'Successfully unsubscribed' });
    } catch (e) {
      console.error('DELETE /push-notifications error:', e);
      return error(500, 'Failed to unsubscribe');
    }
  }

  async function handleSendNotification(event) {
    const { user, response: authResponse } = await requireAuth(event);
    if (authResponse) return authResponse;

    // Only admins can send push notifications
    if (!hasPermission(user, 'users', 'update')) {
      return error(403, 'Only admins can send push notifications');
    }

    try {
      const body = parseBody(event);
      const { user_id, title, message, url, icon, badge } = body;

      if (!user_id || !title || !message) {
        return error(400, 'Missing required fields: user_id, title, message');
      }

      // Get user's active subscriptions
      const subscriptions = await database.all(
        'SELECT id, endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = ? AND is_active = true',
        [user_id]
      );

      if (subscriptions.length === 0) {
        return ok({ message: 'No active subscriptions found for user', sent: 0 });
      }

      const payload = JSON.stringify({
        title,
        body: message,
        icon: icon || '/assets/images/logo-placeholder.svg',
        badge: badge || '/assets/images/logo-placeholder.svg',
        data: { url: url || '/' }
      });

      let successCount = 0;
      let failureCount = 0;

      // Send to all user subscriptions
      for (const sub of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key
            }
          };

          await webpush.sendNotification(pushSubscription, payload);

          // Update last_used timestamp
          await database.run('UPDATE push_subscriptions SET last_used = NOW() WHERE id = ?', [
            sub.id
          ]);

          successCount++;
        } catch (pushError) {
          console.error('Failed to send push to subscription:', sub.id, pushError);

          // If subscription is invalid (410 Gone), mark as inactive
          if (pushError.statusCode === 410) {
            await database.run('UPDATE push_subscriptions SET is_active = false WHERE id = ?', [
              sub.id
            ]);
          }

          failureCount++;
        }
      }

      return ok({
        message: 'Push notifications sent',
        sent: successCount,
        failed: failureCount
      });
    } catch (e) {
      console.error('POST /push-notifications/send error:', e);
      return error(500, 'Failed to send push notifications');
    }
  }

  async function handleGetVapidKey() {
    // Public endpoint - no auth required
    if (!process.env.VAPID_PUBLIC_KEY) {
      return error(500, 'VAPID keys not configured');
    }

    return ok({
      publicKey: process.env.VAPID_PUBLIC_KEY
    });
  }
});
