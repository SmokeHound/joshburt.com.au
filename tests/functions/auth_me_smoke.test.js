/**
 * Smoke test for Netlify auth + users functions.
 * This uses Node's built-in fetch (Node 18+) to call the deployed functions when BASE_URL is set.
 * If running locally with `netlify dev`, set BASE_URL=http://localhost:8888
 * Otherwise it defaults to relative calls which will fail outside a Netlify dev/runtime environment.
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

async function callUsers(token) {
  const res = await fetch(`${BASE}/.netlify/functions/users`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  console.log('🔍 Starting serverless auth/users smoke test...');
  if (!(await isServerAvailable())) {
    console.warn('⚠️ Netlify dev not running at', BASE, '- skipping network smoke tests');
    process.exit(0);
    return;
  }
  try {
    // 1. Login with default admin (ensure env seeded DB)
    const login = await callAuth('login', { email: 'admin@joshburt.com.au', password: 'admin123!' });
    if (login.status !== 200 || !login.json.accessToken) {
      console.error('❌ Login failed', login);
      process.exitCode = 1;
      return;
    }
    console.log('✅ Login ok');

    // 2. Me
    const meRes = await fetch(`${BASE}/.netlify/functions/auth?action=me`, {
      headers: { Authorization: `Bearer ${login.json.accessToken}` }
    });
    const meJson = await meRes.json().catch(() => ({}));
    if (meRes.status !== 200 || !meJson.user) {
      console.error('❌ Me endpoint failed', meRes.status, meJson);
      process.exitCode = 1;
      return;
    }
    console.log('✅ Me ok ->', meJson.user.email);

    // 3. Users list
    const users = await callUsers(login.json.accessToken);
    if (users.status !== 200 || !Array.isArray(users.json.users)) {
      console.error('❌ Users list failed', users);
      process.exitCode = 1;
      return;
    }
    console.log(`✅ Users list ok (${users.json.users.length} users)`);

    console.log('🎉 Smoke test PASSED');
  } catch (err) {
    console.error('❌ Smoke test threw error', err);
    process.exitCode = 1;
  }
})();
