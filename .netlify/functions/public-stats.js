// Netlify Function: Public read-only stats for homepage widgets
// Returns aggregate counts only; no PII, no auth required.

const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');

exports.handler = withHandler(async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' };
  // Ensure DB is connected (connect is idempotent)
  await database.connect();
  try {
    // Users count (active only)
    const usersRow = await database.get('SELECT COUNT(*) AS total FROM users WHERE is_active = 1', []);
    const users = usersRow ? Number(usersRow.total || 0) : 0;

    // Orders count (if table exists; ignore error if not present on some engines)
    let orders = 0;
    try {
      const ordersRow = await database.get('SELECT COUNT(*) AS total FROM orders', []);
      orders = ordersRow ? Number(ordersRow.total || 0) : 0;
    } catch (e) { console.warn('orders table not available', e && e.message ? e.message : e); }

    // Products count (if table exists)
    let products = 0;
    try {
      const productsRow = await database.get('SELECT COUNT(*) AS total FROM products', []);
      products = productsRow ? Number(productsRow.total || 0) : 0;
    } catch (e) { console.warn('products table not available', e && e.message ? e.message : e); }

    return ok({ users, orders, products });
  } catch (e) {
    console.error('public-stats error', e);
    return error(500, 'Failed to load public stats');
  }
});
