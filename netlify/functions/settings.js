// Netlify Function: Site Settings CRUD /netlify/functions/settings
const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const cache = require('../../utils/cache');

exports.handler = withHandler(async function(event){
  await database.connect();
  const method = event.httpMethod;
  if (method === 'GET') return handleGet(event);
  if (method === 'PUT') return handlePut(event);
  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    // Only admins can view settings
    const { user, response: authResponse } = await requirePermission(event, 'settings', 'read');
    if (authResponse) return authResponse;
    
    // Try cache first (5 minute TTL)
    const cached = cache.get('settings', 'config');
    if (cached) {
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json', 
          'X-Cache': 'HIT',
          ...require('../../utils/http').corsHeaders 
        },
        body: cached,
      };
    }
    
    // Single row table: settings (id INTEGER PRIMARY KEY, data TEXT)
    const row = await database.get('SELECT data FROM settings WHERE id = 1');
    // If no row, return empty object
    const data = row && row.data ? row.data : '{}';
    
    // Cache for 5 minutes (300 seconds)
    cache.set('settings', 'config', data, 300);
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json', 
        'X-Cache': 'MISS',
        ...require('../../utils/http').corsHeaders 
      },
      body: data,
    };
  }

  async function handlePut(event) {
    // Only admins can update settings
    const { user, response: authResponse } = await requirePermission(event, 'settings', 'update');
    if (authResponse) return authResponse;
    
    const data = event.body || '{}';
    await database.run('INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;', [data]);
    
    // Invalidate cache on update
    cache.del('settings', 'config');
    
    return ok({ message: 'Settings updated' });
  }
});
