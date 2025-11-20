/**
 * API Keys Management Endpoint
 * Manages API key creation, viewing, and revocation
 * Part of Phase 6: Security Enhancements
 */

const { Pool } = require('../../config/database');
const { withHandler } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const { logAudit } = require('../../utils/audit');
const { getClientIp } = require('../../utils/security-monitor');
const {
  generateApiKey,
  hashApiKey,
  getKeyPrefix
} = require('../../utils/api-key-auth');

/**
 * List API keys for a user
 */
async function listApiKeys(event, pool) {
  await requirePermission(event, 'api_keys', 'read');

  const userId = event.user?.id;
  const { include_all } = event.queryStringParameters || {};

  // Admins can see all keys, regular users only their own
  let query = 'SELECT id, key_prefix, name, permissions, rate_limit, expires_at, last_used, is_active, created_at FROM api_keys';
  const params = [];

  if (include_all === 'true' && event.user?.role === 'admin') {
    // Admin can see all keys
    query += ' ORDER BY created_at DESC';
  } else {
    // Regular users see only their keys
    params.push(userId);
    query += ' WHERE user_id = $1 ORDER BY created_at DESC';
  }

  const result = await pool.query(query, params);

  return {
    statusCode: 200,
    body: JSON.stringify({
      api_keys: result.rows
    })
  };
}

/**
 * Get specific API key details
 */
async function getApiKey(event, pool) {
  await requirePermission(event, 'api_keys', 'read');

  const keyId = event.path.split('/').pop();
  const userId = event.user?.id;
  const isAdmin = event.user?.role === 'admin';

  let query = 'SELECT id, key_prefix, name, permissions, rate_limit, expires_at, last_used, is_active, created_at, metadata FROM api_keys WHERE id = $1';
  const params = [keyId];

  // Non-admins can only see their own keys
  if (!isAdmin) {
    params.push(userId);
    query += ' AND user_id = $2';
  }

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'API key not found' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.rows[0])
  };
}

/**
 * Get API key usage statistics
 */
async function getApiKeyStats(event, pool) {
  await requirePermission(event, 'api_keys', 'read');

  const keyId = event.path.split('/')[event.path.split('/').length - 2];
  const userId = event.user?.id;
  const isAdmin = event.user?.role === 'admin';

  // Verify ownership or admin
  const keyCheck = await pool.query(
    'SELECT user_id FROM api_keys WHERE id = $1',
    [keyId]
  );

  if (keyCheck.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'API key not found' })
    };
  }

  if (!isAdmin && keyCheck.rows[0].user_id !== userId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Access denied' })
    };
  }

  // Get usage statistics
  const stats = await pool.query(
    `SELECT 
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE response_status < 400) as successful_requests,
      COUNT(*) FILTER (WHERE response_status >= 400) as failed_requests,
      COUNT(DISTINCT endpoint) as unique_endpoints,
      COUNT(DISTINCT ip_address) as unique_ips,
      AVG(response_time_ms) as avg_response_time,
      MAX(timestamp) as last_used,
      MIN(timestamp) as first_used
    FROM api_key_usage
    WHERE api_key_id = $1`,
    [keyId]
  );

  // Get recent usage
  const recentUsage = await pool.query(
    `SELECT endpoint, method, ip_address, response_status, response_time_ms, timestamp
    FROM api_key_usage
    WHERE api_key_id = $1
    ORDER BY timestamp DESC
    LIMIT 50`,
    [keyId]
  );

  // Get usage by endpoint
  const usageByEndpoint = await pool.query(
    `SELECT endpoint, COUNT(*) as count
    FROM api_key_usage
    WHERE api_key_id = $1
    GROUP BY endpoint
    ORDER BY count DESC
    LIMIT 10`,
    [keyId]
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      statistics: stats.rows[0],
      recent_usage: recentUsage.rows,
      usage_by_endpoint: usageByEndpoint.rows
    })
  };
}

/**
 * Create new API key
 */
async function createApiKey(event, pool) {
  await requirePermission(event, 'api_keys', 'write');

  const body = JSON.parse(event.body || '{}');
  const userId = event.user?.id;
  const {
    name,
    permissions = [],
    rate_limit = 100,
    expires_at,
    environment = 'live',
    metadata = {}
  } = body;

  // Validate required fields
  if (!name) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Missing required field: name'
      })
    };
  }

  // Validate permissions format
  if (!Array.isArray(permissions)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Permissions must be an array'
      })
    };
  }

  // Generate API key
  const apiKey = generateApiKey(environment);
  const keyHash = hashApiKey(apiKey);
  const keyPrefix = getKeyPrefix(apiKey);

  // Store in database
  const result = await pool.query(
    `INSERT INTO api_keys (
      key_hash,
      key_prefix,
      name,
      user_id,
      permissions,
      rate_limit,
      expires_at,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, key_prefix, name, permissions, rate_limit, expires_at, created_at`,
    [keyHash, keyPrefix, name, userId, permissions, rate_limit, expires_at, JSON.stringify(metadata)]
  );

  await logAudit(
    pool,
    userId,
    'create_api_key',
    `Created API key: ${name}`,
    getClientIp(event)
  );

  // Return the API key - THIS IS THE ONLY TIME IT WILL BE SHOWN
  return {
    statusCode: 201,
    body: JSON.stringify({
      success: true,
      api_key: apiKey, // Full key shown only once
      key_data: result.rows[0],
      warning: 'Save this API key securely. It will not be shown again.'
    })
  };
}

/**
 * Update API key
 */
async function updateApiKey(event, pool) {
  await requirePermission(event, 'api_keys', 'write');

  const keyId = event.path.split('/').pop();
  const userId = event.user?.id;
  const isAdmin = event.user?.role === 'admin';
  const body = JSON.parse(event.body || '{}');

  // Verify ownership or admin
  const keyCheck = await pool.query(
    'SELECT user_id FROM api_keys WHERE id = $1',
    [keyId]
  );

  if (keyCheck.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'API key not found' })
    };
  }

  if (!isAdmin && keyCheck.rows[0].user_id !== userId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Access denied' })
    };
  }

  // Build update query dynamically
  const updates = [];
  const params = [keyId];
  let paramIndex = 2;

  if (body.name !== undefined) {
    params.push(body.name);
    updates.push(`name = $${paramIndex++}`);
  }

  if (body.permissions !== undefined) {
    params.push(body.permissions);
    updates.push(`permissions = $${paramIndex++}`);
  }

  if (body.rate_limit !== undefined) {
    params.push(body.rate_limit);
    updates.push(`rate_limit = $${paramIndex++}`);
  }

  if (body.expires_at !== undefined) {
    params.push(body.expires_at);
    updates.push(`expires_at = $${paramIndex++}`);
  }

  if (body.is_active !== undefined) {
    params.push(body.is_active);
    updates.push(`is_active = $${paramIndex++}`);
  }

  if (body.metadata !== undefined) {
    params.push(JSON.stringify(body.metadata));
    updates.push(`metadata = $${paramIndex++}`);
  }

  if (updates.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No fields to update' })
    };
  }

  const result = await pool.query(
    `UPDATE api_keys
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING id, key_prefix, name, permissions, rate_limit, expires_at, is_active, metadata`,
    params
  );

  await logAudit(
    pool,
    userId,
    'update_api_key',
    `Updated API key #${keyId}`,
    getClientIp(event)
  );

  return {
    statusCode: 200,
    body: JSON.stringify(result.rows[0])
  };
}

/**
 * Revoke (delete) API key
 */
async function revokeApiKey(event, pool) {
  await requirePermission(event, 'api_keys', 'delete');

  const keyId = event.path.split('/').pop();
  const userId = event.user?.id;
  const isAdmin = event.user?.role === 'admin';

  // Verify ownership or admin
  const keyCheck = await pool.query(
    'SELECT user_id, name FROM api_keys WHERE id = $1',
    [keyId]
  );

  if (keyCheck.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'API key not found' })
    };
  }

  if (!isAdmin && keyCheck.rows[0].user_id !== userId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Access denied' })
    };
  }

  const keyName = keyCheck.rows[0].name;

  // Soft delete - mark as inactive
  await pool.query(
    'UPDATE api_keys SET is_active = FALSE WHERE id = $1',
    [keyId]
  );

  await logAudit(
    pool,
    userId,
    'revoke_api_key',
    `Revoked API key: ${keyName}`,
    getClientIp(event)
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: 'API key revoked successfully'
    })
  };
}

/**
 * Main handler
 */
const handler = withHandler(async (event) => {
  const pool = Pool();
  const path = event.path;
  const method = event.httpMethod;

  try {
    // Route based on path and method
    if (path.match(/\/\d+\/stats$/)) {
      return await getApiKeyStats(event, pool);
    }

    if (path.match(/\/\d+$/)) {
      if (method === 'GET') {
        return await getApiKey(event, pool);
      }
      if (method === 'PUT') {
        return await updateApiKey(event, pool);
      }
      if (method === 'DELETE') {
        return await revokeApiKey(event, pool);
      }
    }

    if (method === 'GET') {
      return await listApiKeys(event, pool);
    }

    if (method === 'POST') {
      return await createApiKey(event, pool);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
  } catch (error) {
    console.error('API keys error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
});

module.exports = { handler };
