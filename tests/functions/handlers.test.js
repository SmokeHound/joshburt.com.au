/**
 * Direct handler invocation test (no HTTP) to ensure basic handler contract.
 * Loads auth & users function modules and simulates Netlify event objects.
 */

const path = require('path');

// Lazy require functions
const authFn = require(path.join('..','..','netlify','functions','auth.js'));
const usersFn = require(path.join('..','..','netlify','functions','users.js'));

function makeEvent({ path='/.netlify/functions/auth', httpMethod='POST', query={}, body={}, headers={}, authorization } = {}) {
  const qs = new URLSearchParams(query).toString();
  return {
    path,
    httpMethod,
    headers: authorization ? { authorization: `Bearer ${authorization}`, ...headers } : headers,
    queryStringParameters: Object.keys(query).length ? query : null,
    body: body ? JSON.stringify(body) : null
  };
}

(async () => {
  console.log('🔍 Direct handler tests...');
  try {
    // Register (should succeed or conflict if already exists)
    const email = `handler_test_${Date.now()}@example.com`;
    const register = await authFn.handler(makeEvent({ query:{ action:'register' }, body:{ action:'register', email, password:'Passw0rd!', name:'Handler Test' }}));
    if (![200,201,409].includes(register.statusCode)) { console.error('❌ register handler unexpected', register); process.exitCode=1; return; }
    console.log('✅ register handler ok');

    // Login (using admin account)
    const login = await authFn.handler(makeEvent({ query:{ action:'login' }, body:{ action:'login', email:'admin@joshburt.com.au', password:'admin123!' }}));
    const loginBody = JSON.parse(login.body||'{}');
    if (login.statusCode!==200 || !loginBody.accessToken) { console.error('❌ login handler failed', login); process.exitCode=1; return; }
    console.log('✅ login handler ok');

    // Users list should fail without token (403/401)
    const usersNoAuth = await usersFn.handler({ path:'/.netlify/functions/users', httpMethod:'GET', headers:{} });
    if (![401,403].includes(usersNoAuth.statusCode)) { console.error('❌ users list should be unauthorized', usersNoAuth); process.exitCode=1; return; }
    console.log('✅ users unauthorized without token');

    // Users list with token
    const token = loginBody.accessToken;
    const usersAuth = await usersFn.handler({ path:'/.netlify/functions/users', httpMethod:'GET', headers:{ authorization:`Bearer ${token}` } });
    const usersAuthBody = JSON.parse(usersAuth.body||'{}');
    if (usersAuth.statusCode!==200 || !Array.isArray(usersAuthBody.users)) { console.error('❌ users list with token failed', usersAuth); process.exitCode=1; return; }
    console.log('✅ users list with token ok');

    console.log('🎉 Direct handler tests PASSED');
  } catch (e) {
    console.error('❌ Direct handler tests exception', e); process.exitCode=1;
  }
})();
