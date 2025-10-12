// Netlify Function: GET /.netlify/functions/inventory
const { Client } = require('pg');
const { withHandler, ok, error } = require('../../utils/fn');

exports.handler = withHandler(async function(){
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM inventory');
    await client.end();
    return ok(res.rows);
  } catch (e) {
    try { await client.end(); } catch (endErr) { console.warn('inventory end error', endErr && endErr.message ? endErr.message : endErr); }
    return error(500, 'Failed to fetch inventory', { message: e.message });
  }
});