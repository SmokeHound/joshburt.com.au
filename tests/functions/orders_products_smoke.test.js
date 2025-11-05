/**
 * Smoke test for products + orders serverless functions.
 * Requires default admin credentials and products data to exist (products function should seed or return an array).
 * BASE_URL env var points to deployed site or Netlify dev (http://localhost:8888).
 */

const BASE = process.env.BASE_URL || 'http://localhost:8888';

async function isServerAvailable() {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BASE}/netlify/functions/health`, { signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function call(endpoint, opts = {}) {
  const res = await fetch(`${BASE}/netlify/functions/${endpoint}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

async function login() {
  const res = await fetch(`${BASE}/netlify/functions/auth?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@joshburt.com.au', password: 'admin123!' })
  });
  return res.json().catch(() => ({}));
}

(async () => {
  console.log('🔍 Starting products/orders smoke test...');
  if (!(await isServerAvailable())) {
    console.warn('⚠️ Netlify dev not running at', BASE, '- skipping network smoke tests');
    process.exit(0);
    return;
  }
  try {
    const auth = await login();
    if (!auth.accessToken) {
      console.error('❌ Login failed for orders/products test');
      process.exitCode = 1; return;
    }
    const headers = { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' };

    // Products list
    const products = await call('products');
    if (products.status !== 200 || !Array.isArray(products.json)) {
      console.error('❌ Products list failed', products); process.exitCode = 1; return;
    }
    console.log(`✅ Products list ok (${products.json.length} items)`);

    // Create order (fake order with first product)
    if (products.json.length) {
      const first = products.json[0];
      const orderBody = { requestedBy: 'smoke-test-user', items: [{ name: first.name || first.product_name || 'Test Product', quantity: 1 }] };
      const create = await call('orders', { method: 'POST', headers, body: JSON.stringify(orderBody) });
      if (!(create.status === 200 || create.status === 201)) {
        console.error('❌ Order create failed', create); process.exitCode = 1; return;
      }
      console.log('✅ Order create ok');
    } else {
      console.warn('⚠️ No products returned; skipping order creation');
    }

    // List orders
    const orders = await call('orders');
    if (orders.status !== 200 || !Array.isArray(orders.json)) {
      console.error('❌ Orders list failed', orders); process.exitCode = 1; return;
    }
    console.log(`✅ Orders list ok (${orders.json.length} total)`);
    console.log('🎉 Products/Orders smoke test PASSED');
  } catch (e) {
    console.error('❌ Products/Orders smoke test error', e); process.exitCode = 1;
  }
})();
