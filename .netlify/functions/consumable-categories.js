// Netlify Function: GET /.netlify/functions/consumable-categories
const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');

exports.handler = withHandler(async function(event){
  if (event.httpMethod !== 'GET') return error(405, 'Method Not Allowed');
  
  // All authenticated users can read categories
  const { user, response: authResponse } = await requirePermission(event, 'categories', 'read');
  if (authResponse) return authResponse;
  
  try {
    await database.connect();
    const rows = await database.all('SELECT DISTINCT category FROM consumables WHERE category IS NOT NULL AND category != "" ORDER BY category');
    const categories = rows.map(r => r.category);
    return ok(categories);
  } catch (e) {
    console.error('Consumable categories API error:', e);
    return error(500, 'Failed to fetch categories', { message: e.message });
  }
});
