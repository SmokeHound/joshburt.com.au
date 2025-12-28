// Netlify Function: Site Settings CRUD /.netlify/functions/settings
const { database } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');
const { requireAuth, requirePermission } = require('../../utils/http');
const cache = require('../../utils/cache');

exports.handler = withHandler(async function (event) {
  await database.connect();
  const method = event.httpMethod;
  if (method === 'GET') return handleGet(event);
  if (method === 'PUT') return handlePut(event);
  return error(405, 'Method Not Allowed');

  async function handleGet(event) {
    // Parse query parameters for filtering
    const params = event.queryStringParameters || {};
    const category = params.category;
    const keys = params.keys ? params.keys.split(',') : null;

    // Allow authenticated users to read a safe subset of settings by key.
    // This keeps sensitive settings (SMTP creds, security, etc) admin-only.
    const SAFE_USER_READ_KEYS = ['siteTitle'];
    const isSafeKeysRequest =
      Array.isArray(keys) &&
      keys.length > 0 &&
      keys.every(k => SAFE_USER_READ_KEYS.includes(String(k).trim()));

    if (isSafeKeysRequest) {
      const { response: authResponse } = await requireAuth(event);
      if (authResponse) return authResponse;
    } else {
      // Only admins can view settings (full or broad queries)
      const { response: permResponse } = await requirePermission(event, 'settings', 'read');
      if (permResponse) return permResponse;
    }

    // Generate cache key based on filters
    const cacheKey = `config:${category || 'all'}:${keys ? keys.join(',') : 'all'}`;

    // Try cache first (5 minute TTL)
    const cached = cache.get('settings', cacheKey);
    const cachedLastUpdated = cache.get('settings', `${cacheKey}:meta:lastUpdated`);
    if (cached) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          ...(cachedLastUpdated ? { 'X-Settings-Last-Updated': cachedLastUpdated } : {}),
          ...require('../../utils/http').corsHeaders
        },
        body: cached
      };
    }

    // Build query based on filters
    let query = 'SELECT key, value, category, data_type, description, updated_at FROM settings';
    const queryParams = [];
    const whereClauses = [];

    if (category) {
      whereClauses.push('category = ?');
      queryParams.push(category);
    }

    if (keys && keys.length > 0) {
      whereClauses.push(`key IN (${keys.map(() => '?').join(', ')})`);
      queryParams.push(...keys);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY category, key';

    const rows = await database.all(query, queryParams);

    // Transform to key-value object for backward compatibility
    const settings = {};
    let lastUpdatedMs = null;
    for (const row of rows) {
      let value = row.value;

      // Track last updated timestamp (best-effort)
      try {
        if (row.updated_at) {
          const ms = new Date(row.updated_at).getTime();
          if (!Number.isNaN(ms) && (lastUpdatedMs === null || ms > lastUpdatedMs)) {
            lastUpdatedMs = ms;
          }
        }
      } catch (_) {
        // ignore
      }

      // Parse value based on data type
      if (row.data_type === 'boolean') {
        value = value === 'true' || value === '1' || value === true;
      } else if (row.data_type === 'number') {
        value = parseFloat(value);
      } else if (row.data_type === 'json' || row.data_type === 'array') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string if parse fails
        }
      }

      settings[row.key] = value;
    }

    const lastUpdatedIso = lastUpdatedMs ? new Date(lastUpdatedMs).toISOString() : '';

    // Cache the result for 5 minutes (300 seconds)
    const dataString = JSON.stringify(settings);
    cache.set('settings', cacheKey, dataString, 300);
    if (lastUpdatedIso) {
      cache.set('settings', `${cacheKey}:meta:lastUpdated`, lastUpdatedIso, 300);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        ...(lastUpdatedIso ? { 'X-Settings-Last-Updated': lastUpdatedIso } : {}),
        ...require('../../utils/http').corsHeaders
      },
      body: dataString
    };
  }

  async function handlePut(event) {
    // Only admins can update settings
    const { user, response: authResponse } = await requirePermission(event, 'settings', 'update');
    if (authResponse) return authResponse;

    // Parse the incoming settings object
    let settingsData;
    try {
      settingsData = JSON.parse(event.body || '{}');
    } catch (e) {
      return error(400, 'Invalid JSON in request body');
    }

    // Get database client for transaction
    const client = await database.pool.connect();

    try {
      await client.query('BEGIN');

      // Update each setting individually
      for (const [key, value] of Object.entries(settingsData)) {
        // Get the current setting to know its data_type
        const existing = await client.query('SELECT data_type FROM settings WHERE key = $1', [key]);

        if (existing.rows.length === 0) {
          // Setting doesn't exist, skip or create with default type 'string'
          console.warn(`Setting key '${key}' does not exist in database, skipping`);
          continue;
        }

        const dataType = existing.rows[0].data_type;

        // Convert value to string based on data type
        let valueString;
        if (dataType === 'boolean') {
          valueString = value ? 'true' : 'false';
        } else if (dataType === 'json' || dataType === 'array') {
          valueString = typeof value === 'string' ? value : JSON.stringify(value);
        } else if (dataType === 'number') {
          valueString = String(value);
        } else {
          valueString = String(value);
        }

        // Update the setting
        await client.query(
          'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE key = $3',
          [valueString, user.id, key]
        );
      }

      await client.query('COMMIT');

      // Invalidate all settings cache on update
      cache.clearNamespace('settings');

      return ok({ message: 'Settings updated', updated: Object.keys(settingsData).length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
});
