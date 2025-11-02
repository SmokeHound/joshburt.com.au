/**
 * Direct handler invocation test (no HTTP) to ensure basic handler contract.
 * Loads auth & users function modules and simulates Netlify event objects.
 */

const path = require('path');
const bcrypt = require('bcryptjs');

// Pre-generate password hash for consistent testing
const adminPasswordHash = bcrypt.hashSync('Admin123!', 10);

// Mock database before requiring functions
const mockDb = {
  connect: () => { console.log('📚 Using mocked database connection'); return Promise.resolve(); },
  close: async () => {},
  get: (sql) => {
    // Mock count queries
    if (sql.includes('COUNT(*)')) {
      return Promise.resolve({ total: 1 });
    }
    // Mock admin user for login by email
    if (sql.includes('SELECT') && sql.includes('FROM users WHERE email')) {
      return Promise.resolve({
        id: 1,
        email: 'admin@joshburt.com.au',
        password_hash: adminPasswordHash,
        name: 'Admin User',
        role: 'admin',
        is_verified: 1,
        is_active: 1,
        email_verified: 1,
        failed_login_attempts: 0,
        lockout_expires: null,
        totp_enabled: 0,
        totp_secret: null,
        backup_codes: null,
        created_at: new Date().toISOString()
      });
    }
    // Mock admin user for token verification by ID
    if (sql.includes('SELECT') && sql.includes('FROM users WHERE id')) {
      return Promise.resolve({
        id: 1,
        email: 'admin@joshburt.com.au',
        name: 'Admin User',
        role: 'admin',
        is_active: 1,
        email_verified: 1,
        created_at: new Date().toISOString()
      });
    }
    return Promise.resolve(null);
  },
  run: (sql) => {
    // Mock user registration
    if (sql.includes('INSERT INTO users')) {
      return Promise.resolve({ lastID: Math.floor(Math.random() * 1000) + 100 });
    }
    return Promise.resolve({ changes: 1 });
  },
  all: (sql) => {
    // Mock users list
    if (sql.includes('SELECT') && sql.includes('FROM users')) {
      return Promise.resolve([{
        id: 1,
        email: 'admin@joshburt.com.au',
        name: 'Admin User',
        role: 'admin',
        is_verified: 1,
        is_active: 1,
        created_at: new Date().toISOString()
      }]);
    }
    return Promise.resolve([]);
  }
};

// Mock the database module exports
const dbPath = path.join('..', '..', 'config', 'database.js');
require.cache[require.resolve(dbPath)] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    Database: function() { return mockDb; },
    database: mockDb,
    initializeDatabase: () => Promise.resolve()
  }
};

// Lazy require functions after mocking
const authFn = require(path.join('..','..','netlify','functions','auth.js'));
const usersFn = require(path.join('..','..','netlify','functions','users.js'));

function makeEvent({ path='/.netlify/functions/auth', httpMethod='POST', query={}, body={}, headers={}, authorization } = {}) {
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
    const register = await authFn.handler(makeEvent({ query:{ action:'register' }, body:{ action:'register', email, password:'Passw0rd!', name:'Handler Test' } }));
    if (![200,201,409].includes(register.statusCode)) { console.error('❌ register handler unexpected', register); process.exitCode=1; return; }
    console.log('✅ register handler ok');

    // Login (using admin account)
    const login = await authFn.handler(makeEvent({ query:{ action:'login' }, body:{ action:'login', email:'admin@joshburt.com.au', password:'Admin123!' } }));
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
    process.exitCode = 0;
  } catch (e) {
    console.error('❌ Direct handler tests exception', e); process.exitCode=1;
  }
})();
