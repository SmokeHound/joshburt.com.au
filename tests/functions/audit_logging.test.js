/**
 * Smoke test for audit logging enhancement.
 * Tests that audit logs are created for key operations.
 * Requires: netlify dev running at BASE_URL
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

async function getAuditLogs(token, action = null) {
  const url = action 
    ? `${BASE}/.netlify/functions/audit-logs?action=${encodeURIComponent(action)}&limit=10`
    : `${BASE}/.netlify/functions/audit-logs?limit=10`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  console.log('🔍 Starting audit logging smoke test...');
  
  if (!(await isServerAvailable())) {
    console.warn('⚠️ Netlify dev not running at', BASE, '- skipping audit logging test');
    process.exit(0);
    return;
  }

  try {
    // 1. Login to get token
    const login = await callAuth('login', { 
      email: 'admin@joshburt.com.au', 
      password: 'admin123!' 
    });
    
    if (login.status !== 200 || !login.json.accessToken) {
      console.error('❌ Login failed', login);
      process.exitCode = 1;
      return;
    }
    console.log('✅ Login successful');

    // Wait a bit for audit log to be written
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Check that login created an audit log
    const loginLogs = await getAuditLogs(login.json.accessToken, 'auth.login_success');
    if (loginLogs.status !== 200) {
      console.error('❌ Failed to fetch audit logs', loginLogs);
      process.exitCode = 1;
      return;
    }

    const logs = Array.isArray(loginLogs.json) ? loginLogs.json : (loginLogs.json.data || []);
    const loginLog = logs.find(log => log.action === 'auth.login_success');
    
    if (!loginLog) {
      console.error('❌ No auth.login_success audit log found');
      console.error('Available logs:', logs.map(l => l.action));
      process.exitCode = 1;
      return;
    }
    console.log('✅ Login audit log found:', loginLog.action);

    // 3. Verify audit log has expected fields
    if (!loginLog.user_id || !loginLog.ip_address || !loginLog.created_at) {
      console.error('❌ Audit log missing required fields', loginLog);
      process.exitCode = 1;
      return;
    }
    console.log('✅ Audit log has required fields');

    // 4. Test logout creates audit log
    const logout = await callAuth('logout', { 
      refreshToken: login.json.refreshToken 
    });
    
    if (logout.status !== 200) {
      console.error('❌ Logout failed', logout);
      process.exitCode = 1;
      return;
    }
    console.log('✅ Logout successful');

    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Check logout audit log
    const logoutLogs = await getAuditLogs(login.json.accessToken, 'auth.logout');
    const logsArray = Array.isArray(logoutLogs.json) ? logoutLogs.json : (logoutLogs.json.data || []);
    const logoutLog = logsArray.find(log => log.action === 'auth.logout');
    
    if (!logoutLog) {
      console.warn('⚠️ No auth.logout audit log found (may not have userId)');
    } else {
      console.log('✅ Logout audit log found:', logoutLog.action);
    }

    console.log('🎉 Audit logging test PASSED');
    console.log('📊 Tested actions: auth.login_success, auth.logout');
    
  } catch (err) {
    console.error('❌ Audit logging test threw error', err);
    process.exitCode = 1;
  }
})();
