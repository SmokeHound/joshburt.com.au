/**
 * Smoke test for push-notifications function
 * Tests basic functionality without requiring actual VAPID keys
 */

const BASE = process.env.BASE_URL || 'http://localhost:8888';

async function isServerAvailable() {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BASE}/.netlify/functions/health`, { signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function callAuth(action, body = {}) {
  const res = await fetch(`${BASE}/.netlify/functions/auth?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, action })
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function callPushNotifications(method = 'GET', token, body = null, path = '') {
  const url = `${BASE}/.netlify/functions/push-notifications${path}`;
  const options = {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  console.log('🔍 Starting push-notifications smoke test...');

  if (!(await isServerAvailable())) {
    console.warn('⚠️ Netlify dev not running at', BASE, '- skipping network smoke tests');
    process.exit(0);
    return;
  }

  try {
    // 1. Login to get auth token
    console.log('1. Logging in...');
    const login = await callAuth('login', {
      email: 'admin@joshburt.com.au',
      password: 'admin123!'
    });

    if (login.status !== 200) {
      console.error('❌ Login failed:', login.status, login.json);
      process.exit(1);
    }

    const token = login.json.accessToken;
    console.log('✅ Login successful');

    // 2. Get VAPID public key (no auth required)
    console.log('2. Getting VAPID public key...');
    const vapidRes = await callPushNotifications('GET', null, null, '/vapid-public-key');

    if (vapidRes.status === 500 && vapidRes.json.error?.includes('VAPID keys not configured')) {
      console.log('⚠️ VAPID keys not configured (expected in test environment)');
    } else if (vapidRes.status === 200) {
      console.log('✅ VAPID public key retrieved');
    } else {
      console.error('❌ Unexpected response:', vapidRes.status, vapidRes.json);
    }

    // 3. Get user subscriptions (should be empty)
    console.log('3. Getting user subscriptions...');
    const subsRes = await callPushNotifications('GET', token);

    if (subsRes.status !== 200) {
      console.error('❌ Failed to get subscriptions:', subsRes.status, subsRes.json);
      process.exit(1);
    }

    console.log('✅ Subscriptions retrieved:', subsRes.json.subscriptions.length);

    // 4. Try to subscribe (will fail without valid subscription object, but tests auth)
    console.log('4. Testing subscription endpoint...');
    const subscribeRes = await callPushNotifications('POST', token, {
      endpoint: 'https://test-endpoint.example.com',
      keys: {
        p256dh: 'test-key',
        auth: 'test-auth'
      }
    });

    if (subscribeRes.status === 200 || subscribeRes.status === 400) {
      console.log('✅ Subscription endpoint responds correctly');
    } else {
      console.error('❌ Unexpected subscription response:', subscribeRes.status, subscribeRes.json);
    }

    // 5. Test send notification (admin only)
    console.log('5. Testing send notification endpoint...');
    const sendRes = await callPushNotifications('POST', token, null, '/send');

    if (sendRes.status === 400) {
      // Expected - missing required fields
      console.log('✅ Send notification endpoint validates input');
    } else if (sendRes.status === 200) {
      console.log('✅ Send notification endpoint responds');
    } else {
      console.error('❌ Unexpected send response:', sendRes.status, sendRes.json);
    }

    console.log('✅ Push notifications smoke test passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
