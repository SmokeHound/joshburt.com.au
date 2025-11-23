const { withHandler } = require('../../utils/fn');
const { json } = require('../../utils/http');
const { database } = require('../../config/database');

exports.handler = withHandler(async (event) => {
  try {
    await database.connect();

    const qs = (event && event.queryStringParameters) || {};
    const threshold = parseInt(qs.threshold, 10) || 10;

    const rows = await database.all(
      'SELECT id, name, stock_quantity FROM products WHERE stock_quantity IS NOT NULL AND stock_quantity <= ? ORDER BY stock_quantity ASC LIMIT 50',
      [threshold]
    );

    return json(200, rows || []);
  } catch (e) {
    console.error('low-stock function error', e);
    return json(500, { error: 'Failed to fetch low stock products' });
  }
});
