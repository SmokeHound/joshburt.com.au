/**
 * Comprehensive Role-Based Access Control (RBAC) Tests
 * Tests three roles: admin, manager, user
 * Tests permissions across all protected endpoints
 */

const path = require('path');
const authFn = require(path.join('..', '..', 'netlify', 'functions', 'auth.js'));
const usersFn = require(path.join('..', '..', 'netlify', 'functions', 'users.js'));
const productsFn = require(path.join('..', '..', '.netlify', 'functions', 'products.js'));
const ordersFn = require(path.join('..', '..', '.netlify', 'functions', 'orders.js'));

function makeEvent({ path = '/', httpMethod = 'GET', query = {}, body = {}, headers = {}, authorization } = {}) {
  return {
    path,
    httpMethod,
    headers: authorization ? { authorization: `Bearer ${authorization}`, ...headers } : headers,
    queryStringParameters: Object.keys(query).length ? query : null,
    body: body ? JSON.stringify(body) : null
  };
}

async function createTestUser(email, password, name, role = 'user') {
  const response = await usersFn.handler(makeEvent({
    path: '/.netlify/functions/users',
    httpMethod: 'POST',
    body: { email, password, name, role },
    authorization: adminToken
  }));
  const result = JSON.parse(response.body || '{}');
  return result.user;
}

async function loginAs(email, password) {
  const response = await authFn.handler(makeEvent({
    path: '/.netlify/functions/auth',
    query: { action: 'login' },
    httpMethod: 'POST',
    body: { action: 'login', email, password }
  }));
  const result = JSON.parse(response.body || '{}');
  if (response.statusCode !== 200 || !result.accessToken) {
    throw new Error(`Login failed for ${email}: ${result.error || 'unknown'}`);
  }
  return result.accessToken;
}

let adminToken, managerToken, userToken;
let testManager, testUser;

(async () => {
  console.log('🔒 Starting RBAC tests...\n');
  let failures = 0;

  try {
    // Step 1: Login as admin (default admin user)
    console.log('1️⃣  Logging in as admin...');
    adminToken = await loginAs('admin@joshburt.com.au', 'Admin123!');
    console.log('   ✅ Admin login successful\n');

    // Step 2: Create test manager and user
    console.log('2️⃣  Creating test manager and user...');
    const timestamp = Date.now();
    testManager = await createTestUser(
      `manager_rbac_${timestamp}@example.com`,
      'Manager123!',
      'Test Manager',
      'manager'
    );
    testUser = await createTestUser(
      `user_rbac_${timestamp}@example.com`,
      'User123!',
      'Test User',
      'user'
    );
    console.log('   ✅ Test users created\n');

    // Step 3: Login as manager and user
    console.log('3️⃣  Logging in as manager and user...');
    managerToken = await loginAs(testManager.email, 'Manager123!');
    userToken = await loginAs(testUser.email, 'User123!');
    console.log('   ✅ All users logged in\n');

    // Test 4: User Management Permissions
    console.log('4️⃣  Testing User Management Permissions...');

    // Admin should be able to list users
    let res = await usersFn.handler(makeEvent({
      path: '/.netlify/functions/users',
      httpMethod: 'GET',
      authorization: adminToken
    }));
    if (res.statusCode !== 200) {
      console.log('   ❌ Admin cannot list users');
      failures++;
    } else {
      console.log('   ✅ Admin can list users');
    }

    // Manager should be able to list users
    res = await usersFn.handler(makeEvent({
      path: '/.netlify/functions/users',
      httpMethod: 'GET',
      authorization: managerToken
    }));
    if (res.statusCode !== 200) {
      console.log('   ❌ Manager cannot list users');
      failures++;
    } else {
      console.log('   ✅ Manager can list users');
    }

    // Regular user should NOT be able to list users
    res = await usersFn.handler(makeEvent({
      path: '/.netlify/functions/users',
      httpMethod: 'GET',
      authorization: userToken
    }));
    if (res.statusCode !== 403) {
      console.log('   ❌ Regular user can list users (should be denied)');
      failures++;
    } else {
      console.log('   ✅ Regular user correctly denied from listing users');
    }

    // Only admin can create users
    res = await usersFn.handler(makeEvent({
      path: '/.netlify/functions/users',
      httpMethod: 'POST',
      body: { email: 'test@test.com', password: 'Test123!', name: 'Test', role: 'user' },
      authorization: managerToken
    }));
    if (res.statusCode !== 403) {
      console.log('   ❌ Manager can create users (should be denied)');
      failures++;
    } else {
      console.log('   ✅ Manager correctly denied from creating users');
    }

    console.log();

    // Test 5: Products Permissions
    console.log('5️⃣  Testing Products Permissions...');

    // All roles can read products
    res = await productsFn.handler(makeEvent({
      path: '/.netlify/functions/products',
      httpMethod: 'GET',
      authorization: userToken
    }));
    if (res.statusCode !== 200) {
      console.log('   ❌ User cannot read products');
      failures++;
    } else {
      console.log('   ✅ User can read products');
    }

    // Manager can create products
    res = await productsFn.handler(makeEvent({
      path: '/.netlify/functions/products',
      httpMethod: 'POST',
      body: { name: 'Test Product', code: `TEST-${timestamp}`, type: 'Test' },
      authorization: managerToken
    }));
    if (res.statusCode !== 201) {
      console.log('   ❌ Manager cannot create products');
      failures++;
    } else {
      console.log('   ✅ Manager can create products');
    }

    // Regular user cannot create products
    res = await productsFn.handler(makeEvent({
      path: '/.netlify/functions/products',
      httpMethod: 'POST',
      body: { name: 'Test Product 2', code: `TEST2-${timestamp}`, type: 'Test' },
      authorization: userToken
    }));
    if (res.statusCode !== 403) {
      console.log('   ❌ User can create products (should be denied)');
      failures++;
    } else {
      console.log('   ✅ User correctly denied from creating products');
    }

    console.log();

    // Test 6: Orders Permissions
    console.log('6️⃣  Testing Orders Permissions...');

    // All authenticated users can create orders
    res = await ordersFn.handler(makeEvent({
      path: '/.netlify/functions/orders',
      httpMethod: 'POST',
      body: { items: [{ name: 'Test', code: 'TEST', quantity: 1 }] },
      authorization: userToken
    }));
    if (res.statusCode !== 201) {
      console.log('   ❌ User cannot create orders');
      failures++;
    } else {
      console.log('   ✅ User can create orders');
    }

    // Regular users cannot list all orders
    res = await ordersFn.handler(makeEvent({
      path: '/.netlify/functions/orders',
      httpMethod: 'GET',
      authorization: userToken
    }));
    if (res.statusCode !== 403) {
      console.log('   ❌ User can list orders (should be denied)');
      failures++;
    } else {
      console.log('   ✅ User correctly denied from listing orders');
    }

    // Managers can list orders
    res = await ordersFn.handler(makeEvent({
      path: '/.netlify/functions/orders',
      httpMethod: 'GET',
      authorization: managerToken
    }));
    if (res.statusCode !== 200) {
      console.log('   ❌ Manager cannot list orders');
      failures++;
    } else {
      console.log('   ✅ Manager can list orders');
    }

    console.log();

    // Test 7: Password Validation
    console.log('7️⃣  Testing Password Validation...');

    // Weak password should be rejected
    res = await authFn.handler(makeEvent({
      path: '/.netlify/functions/auth',
      query: { action: 'register' },
      httpMethod: 'POST',
      body: { action: 'register', email: `weak_${timestamp}@test.com`, password: 'weak', name: 'Weak' }
    }));
    if (res.statusCode !== 400) {
      console.log(`   ❌ Weak password was accepted (got status ${res.statusCode}, expected 400)`);
      console.log(`      Response: ${res.body}`);
      failures++;
    } else {
      console.log('   ✅ Weak password correctly rejected');
    }

    // Strong password should be accepted
    res = await authFn.handler(makeEvent({
      path: '/.netlify/functions/auth',
      query: { action: 'register' },
      httpMethod: 'POST',
      body: { action: 'register', email: `strong_${timestamp}@test.com`, password: 'Strong123!', name: 'Strong' }
    }));
    if (![200, 201].includes(res.statusCode)) {
      console.log(`   ❌ Strong password was rejected (got status ${res.statusCode})`);
      console.log(`      Response: ${res.body}`);
      failures++;
    } else {
      console.log('   ✅ Strong password accepted');
    }

    console.log();

    // Summary
    console.log('════════════════════════════════════');
    if (failures === 0) {
      console.log('🎉 All RBAC tests PASSED!');
      process.exitCode = 0;
    } else {
      console.log(`❌ ${failures} test(s) FAILED`);
      process.exitCode = 1;
    }
    console.log('════════════════════════════════════\n');

  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exitCode = 1;
  }
})();
