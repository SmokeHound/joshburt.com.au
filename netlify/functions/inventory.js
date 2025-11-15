// Netlify Function: GET /.netlify/functions/inventory
const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');

exports.handler = withHandler(async function (event) {
  // Only admins and managers can view inventory
  const { user, response: authResponse } = await requirePermission(event, 'inventory', 'read');
  if (authResponse) return authResponse;

  try {
    await database.connect();
    const inventory = await database.all('SELECT * FROM inventory');
    return ok(inventory);
  } catch (e) {
    console.error('Inventory API error:', e);
    return error(500, 'Failed to fetch inventory', { message: e.message });
  }
});
