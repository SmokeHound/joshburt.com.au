/**
 * Security Events API Endpoint
 * Manages security event logging and monitoring
 * Part of Phase 6: Security Enhancements
 */

const { Pool } = require('../../config/database');
const { withHandler } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const { logAudit } = require('../../utils/audit');
const {
  logSecurityEvent,
  isIpBlacklisted,
  addToBlacklist,
  removeFromBlacklist,
  getClientIp,
  EVENT_TYPES,
  SEVERITY
} = require('../../utils/security-monitor');

/**
 * List security events with pagination and filtering
 */
async function listEvents(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'security', 'read');
  if (authResponse) return authResponse;

  const {
    event_type,
    severity,
    resolved,
    ip_address,
    start_date,
    end_date,
    limit = 50,
    offset = 0
  } = event.queryStringParameters || {};

  let query = 'SELECT * FROM security_events WHERE 1=1';
  const params = [];

  if (event_type) {
    params.push(event_type);
    query += ` AND event_type = $${params.length}`;
  }

  if (severity) {
    params.push(severity);
    query += ` AND severity = $${params.length}`;
  }

  if (resolved !== undefined) {
    params.push(resolved === 'true');
    query += ` AND resolved = $${params.length}`;
  }

  if (ip_address) {
    params.push(ip_address);
    query += ` AND ip_address = $${params.length}`;
  }

  if (start_date) {
    params.push(start_date);
    query += ` AND timestamp >= $${params.length}`;
  }

  if (end_date) {
    params.push(end_date);
    query += ` AND timestamp <= $${params.length}`;
  }

  query += ' ORDER BY timestamp DESC';
  params.push(parseInt(limit));
  query += ` LIMIT $${params.length}`;
  params.push(parseInt(offset));
  query += ` OFFSET $${params.length}`;

  const result = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM security_events WHERE 1=1';
  const countParams = [];
  let paramIndex = 1;

  if (event_type) {
    countParams.push(event_type);
    countQuery += ` AND event_type = $${paramIndex++}`;
  }
  if (severity) {
    countParams.push(severity);
    countQuery += ` AND severity = $${paramIndex++}`;
  }
  if (resolved !== undefined) {
    countParams.push(resolved === 'true');
    countQuery += ` AND resolved = $${paramIndex++}`;
  }
  if (ip_address) {
    countParams.push(ip_address);
    countQuery += ` AND ip_address = $${paramIndex++}`;
  }
  if (start_date) {
    countParams.push(start_date);
    countQuery += ` AND timestamp >= $${paramIndex++}`;
  }
  if (end_date) {
    countParams.push(end_date);
    countQuery += ` AND timestamp <= $${paramIndex++}`;
  }

  const countResult = await pool.query(countQuery, countParams);

  return {
    statusCode: 200,
    body: JSON.stringify({
      events: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  };
}

/**
 * Get specific security event
 */
async function getEvent(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'security', 'read');
  if (authResponse) return authResponse;

  const eventId = event.path.split('/').pop();
  const result = await pool.query('SELECT * FROM security_events WHERE id = $1', [eventId]);

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Security event not found' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.rows[0])
  };
}

/**
 * Get security statistics
 */
async function getStats(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'security', 'read');
  if (authResponse) return authResponse;

  const { days = 7 } = event.queryStringParameters || {};

  // Get overall stats
  const overallStats = await pool.query(
    `SELECT 
      COUNT(*) as total_events,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
      COUNT(*) FILTER (WHERE severity = 'high') as high_count,
      COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
      COUNT(*) FILTER (WHERE severity = 'low') as low_count,
      COUNT(*) FILTER (WHERE resolved = TRUE) as resolved_count,
      COUNT(*) FILTER (WHERE resolved = FALSE) as unresolved_count,
      COUNT(DISTINCT ip_address) as unique_ips,
      COUNT(DISTINCT user_id) as affected_users
    FROM security_events
    WHERE timestamp > NOW() - INTERVAL '${parseInt(days)} days'`
  );

  // Get events by type
  const eventsByType = await pool.query(
    `SELECT event_type, COUNT(*) as count
    FROM security_events
    WHERE timestamp > NOW() - INTERVAL '${parseInt(days)} days'
    GROUP BY event_type
    ORDER BY count DESC`
  );

  // Get top offending IPs
  const topIPs = await pool.query(
    `SELECT ip_address, COUNT(*) as event_count
    FROM security_events
    WHERE timestamp > NOW() - INTERVAL '${parseInt(days)} days'
    GROUP BY ip_address
    ORDER BY event_count DESC
    LIMIT 10`
  );

  // Get blacklist stats
  const blacklistStats = await pool.query(
    `SELECT 
      COUNT(*) as total_blacklisted,
      COUNT(*) FILTER (WHERE is_active = TRUE) as active_blacklisted,
      COUNT(*) FILTER (WHERE auto_added = TRUE) as auto_blacklisted
    FROM ip_blacklist`
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      overall: overallStats.rows[0],
      by_type: eventsByType.rows,
      top_ips: topIPs.rows,
      blacklist: blacklistStats.rows[0],
      period_days: parseInt(days)
    })
  };
}

/**
 * Create new security event
 */
async function createEvent(event, pool) {
  // Security events can be created by authenticated users or system
  // Don't require specific permission as this is used internally

  const body = JSON.parse(event.body || '{}');
  const { event_type, severity, user_id, ip_address, user_agent, description, metadata } = body;

  // Validate required fields
  if (!event_type || !severity || !ip_address || !description) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Missing required fields',
        required: ['event_type', 'severity', 'ip_address', 'description']
      })
    };
  }

  // Validate severity
  if (!Object.values(SEVERITY).includes(severity)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Invalid severity',
        valid_values: Object.values(SEVERITY)
      })
    };
  }

  const eventId = await logSecurityEvent({
    eventType: event_type,
    severity,
    userId: user_id,
    ipAddress: ip_address,
    userAgent: user_agent,
    description,
    metadata: metadata || {}
  });

  return {
    statusCode: 201,
    body: JSON.stringify({
      success: true,
      event_id: eventId
    })
  };
}

/**
 * Resolve security event
 */
async function resolveEvent(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'security', 'write');
  if (authResponse) return authResponse;

  const eventId = event.path.split('/')[event.path.split('/').length - 2];
  const body = JSON.parse(event.body || '{}');
  const { resolution_notes } = body;
  const userId = event.user?.id;

  const result = await pool.query(
    `UPDATE security_events
    SET resolved = TRUE,
        resolved_by = $1,
        resolved_at = NOW(),
        resolution_notes = $2
    WHERE id = $3
    RETURNING *`,
    [userId, resolution_notes, eventId]
  );

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Security event not found' })
    };
  }

  await logAudit(
    pool,
    userId,
    'resolve_security_event',
    `Resolved security event #${eventId}`,
    getClientIp(event)
  );

  return {
    statusCode: 200,
    body: JSON.stringify(result.rows[0])
  };
}

/**
 * List IP blacklist
 */
async function listBlacklist(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'security', 'read');
  if (authResponse) return authResponse;

  const { active_only = 'true', limit = 50, offset = 0 } = event.queryStringParameters || {};

  let query = 'SELECT * FROM ip_blacklist WHERE 1=1';
  const params = [];

  if (active_only === 'true') {
    query += ' AND is_active = TRUE';
  }

  query += ' ORDER BY added_at DESC';
  params.push(parseInt(limit));
  query += ` LIMIT $${params.length}`;
  params.push(parseInt(offset));
  query += ` OFFSET $${params.length}`;

  const result = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM ip_blacklist WHERE 1=1';
  if (active_only === 'true') {
    countQuery += ' AND is_active = TRUE';
  }
  const countResult = await pool.query(countQuery);

  return {
    statusCode: 200,
    body: JSON.stringify({
      blacklist: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  };
}

/**
 * Add IP to blacklist
 */
async function addBlacklist(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'security', 'write');
  if (authResponse) return authResponse;

  const body = JSON.parse(event.body || '{}');
  const { ip_address, reason, expires_at } = body;
  const userId = event.user?.id;

  if (!ip_address || !reason) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Missing required fields',
        required: ['ip_address', 'reason']
      })
    };
  }

  const blacklistId = await addToBlacklist({
    ipAddress: ip_address,
    reason,
    addedBy: userId,
    expiresAt: expires_at
  });

  await logAudit(
    pool,
    userId,
    'add_ip_blacklist',
    `Added IP ${ip_address} to blacklist: ${reason}`,
    getClientIp(event)
  );

  return {
    statusCode: 201,
    body: JSON.stringify({
      success: true,
      blacklist_id: blacklistId
    })
  };
}

/**
 * Remove IP from blacklist
 */
async function removeBlacklist(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'security', 'write');
  if (authResponse) return authResponse;

  const ipAddress = event.path.split('/').pop();
  const userId = event.user?.id;

  await removeFromBlacklist(ipAddress);

  await logAudit(
    pool,
    userId,
    'remove_ip_blacklist',
    `Removed IP ${ipAddress} from blacklist`,
    getClientIp(event)
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
}

/**
 * Check if IP is blacklisted
 */
async function checkBlacklist(event, pool) {
  const ipAddress = event.queryStringParameters?.ip_address || getClientIp(event);

  const blacklisted = await isIpBlacklisted(ipAddress);

  return {
    statusCode: 200,
    body: JSON.stringify({
      ip_address: ipAddress,
      blacklisted
    })
  };
}

/**
 * Main handler
 */
const handler = withHandler(async event => {
  const pool = Pool();
  const path = event.path;
  const method = event.httpMethod;

  try {
    // Route based on path and method
    if (path.includes('/stats')) {
      return await getStats(event, pool);
    }

    if (path.includes('/blacklist/check')) {
      return await checkBlacklist(event, pool);
    }

    if (path.includes('/blacklist')) {
      if (method === 'GET') {
        return await listBlacklist(event, pool);
      }
      if (method === 'POST') {
        return await addBlacklist(event, pool);
      }
      if (method === 'DELETE') {
        return await removeBlacklist(event, pool);
      }
    }

    if (path.match(/\/\d+\/resolve$/)) {
      return await resolveEvent(event, pool);
    }

    if (path.match(/\/\d+$/)) {
      return await getEvent(event, pool);
    }

    if (method === 'GET') {
      return await listEvents(event, pool);
    }

    if (method === 'POST') {
      return await createEvent(event, pool);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
  } catch (error) {
    console.error('Security events error:', error);
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
