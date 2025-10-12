const { withHandler } = require('../../utils/fn');
const { json } = require('../../utils/http');
const { database } = require('../../config/database');

exports.handler = withHandler(async () => {
  try {
    await database.connect();
    const stats = { users: 0, orders: 0, products: 0 };
  try { const u = await database.get('SELECT COUNT(1) AS c FROM users'); stats.users = (u && u.c) || 0; } catch (e) { /* ignore missing users table */ }
  try { const o = await database.get('SELECT COUNT(1) AS c FROM orders'); stats.orders = (o && o.c) || 0; } catch (e) { /* ignore missing orders table */ }
  try { const p = await database.get('SELECT COUNT(1) AS c FROM products'); stats.products = (p && p.c) || 0; } catch (e) { /* ignore missing products table */ }
    return json(200, stats);
  } catch (e) {
    return json(200, { users: 0, orders: 0, products: 0 });
  }
});
