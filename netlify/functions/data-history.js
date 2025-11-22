/**
 * Data History API Endpoint
 * Tracks and retrieves data version history
 * Part of Phase 4: Data Management
 */

const { database } = require('../../config/database');
const { withHandler } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const { logAudit } = require('../../utils/audit');

/**
 * Get history for a specific record
 */
async function getRecordHistory(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'data_history', 'read');
  if (authResponse) return authResponse;

  const { table_name, record_id, limit = 50, offset = 0 } = event.queryStringParameters || {};

  if (!table_name || !record_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'table_name and record_id are required' })
    };
  }

  const query = `
    SELECT 
      h.*,
      u.email as changed_by_email,
      u.name as changed_by_name
    FROM data_history h
    LEFT JOIN users u ON h.changed_by = u.id
    WHERE h.table_name = $1 AND h.record_id = $2
    ORDER BY h.changed_at DESC
    LIMIT $3 OFFSET $4
  `;

  const result = await pool.query(query, [table_name, record_id, limit, offset]);

  // Get total count
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM data_history WHERE table_name = $1 AND record_id = $2',
    [table_name, record_id]
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      history: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  };
}

/**
 * Get all history with filters
 */
async function getAllHistory(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'data_history', 'read');
  if (authResponse) return authResponse;

  const {
    table_name,
    action,
    changed_by,
    date_from,
    date_to,
    limit = 50,
    offset = 0
  } = event.queryStringParameters || {};

  let query = `
    SELECT 
      h.*,
      u.email as changed_by_email,
      u.name as changed_by_name
    FROM data_history h
    LEFT JOIN users u ON h.changed_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (table_name) {
    params.push(table_name);
    query += ` AND h.table_name = $${params.length}`;
  }

  if (action) {
    params.push(action);
    query += ` AND h.action = $${params.length}`;
  }

  if (changed_by) {
    params.push(changed_by);
    query += ` AND h.changed_by = $${params.length}`;
  }

  if (date_from) {
    params.push(date_from);
    query += ` AND h.changed_at >= $${params.length}`;
  }

  if (date_to) {
    params.push(date_to);
    query += ` AND h.changed_at <= $${params.length}`;
  }

  query += ' ORDER BY h.changed_at DESC';
  params.push(parseInt(limit));
  query += ` LIMIT $${params.length}`;
  params.push(parseInt(offset));
  query += ` OFFSET $${params.length}`;

  const result = await pool.query(query, params);

  // Get total count with same filters
  let countQuery = 'SELECT COUNT(*) FROM data_history h WHERE 1=1';
  const countParams = [];

  if (table_name) {
    countParams.push(table_name);
    countQuery += ` AND h.table_name = $${countParams.length}`;
  }

  if (action) {
    countParams.push(action);
    countQuery += ` AND h.action = $${countParams.length}`;
  }

  if (changed_by) {
    countParams.push(changed_by);
    countQuery += ` AND h.changed_by = $${countParams.length}`;
  }

  if (date_from) {
    countParams.push(date_from);
    countQuery += ` AND h.changed_at >= $${countParams.length}`;
  }

  if (date_to) {
    countParams.push(date_to);
    countQuery += ` AND h.changed_at <= $${countParams.length}`;
  }

  const countResult = await pool.query(countQuery, countParams);

  return {
    statusCode: 200,
    body: JSON.stringify({
      history: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  };
}

/**
 * Compare two versions of a record
 */
async function compareVersions(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'data_history', 'read');
  if (authResponse) return authResponse;

  const { history_id_1, history_id_2 } = event.queryStringParameters || {};

  if (!history_id_1 || !history_id_2) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Both history_id_1 and history_id_2 are required' })
    };
  }

  const result = await pool.query(
    'SELECT * FROM data_history WHERE id IN ($1, $2) ORDER BY changed_at',
    [history_id_1, history_id_2]
  );

  if (result.rows.length !== 2) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'One or both history records not found' })
    };
  }

  const [version1, version2] = result.rows;

  // Calculate differences
  const differences = [];
  const data1 = version1.new_data || version1.old_data || {};
  const data2 = version2.new_data || version2.old_data || {};

  const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);

  for (const key of allKeys) {
    if (JSON.stringify(data1[key]) !== JSON.stringify(data2[key])) {
      differences.push({
        field: key,
        old_value: data1[key],
        new_value: data2[key]
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      version1,
      version2,
      differences
    })
  };
}

/**
 * Restore a previous version
 */
async function restoreVersion(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'data_history', 'update');
  if (authResponse) return authResponse;

  const historyId = event.path.split('/').pop();

  // Get the history record
  const historyResult = await pool.query('SELECT * FROM data_history WHERE id = $1', [historyId]);

  if (historyResult.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'History record not found' })
    };
  }

  const history = historyResult.rows[0];
  const dataToRestore = history.new_data || history.old_data;

  if (!dataToRestore) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No data available to restore' })
    };
  }

  // Build update query
  const columns = Object.keys(dataToRestore).filter(k => k !== 'id');
  const setClause = columns.map((col, idx) => `${col} = $${idx + 1}`).join(', ');
  const values = columns.map(col => dataToRestore[col]);
  values.push(history.record_id);

  const updateQuery = `
    UPDATE ${history.table_name}
    SET ${setClause}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query(updateQuery, values);

  await logAudit(
    pool,
    user.id,
    'version_restored',
    {
      history_id: historyId,
      table_name: history.table_name,
      record_id: history.record_id
    },
    event
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Version restored successfully',
      restored_record: result.rows[0]
    })
  };
}

/**
 * Get change statistics
 */
async function getStats(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'data_history', 'read');
  if (authResponse) return authResponse;

  const { table_name, days = 30 } = event.queryStringParameters || {};

  let query = `
    SELECT 
      table_name,
      action,
      COUNT(*) as change_count,
      COUNT(DISTINCT record_id) as unique_records,
      COUNT(DISTINCT changed_by) as unique_users
    FROM data_history
    WHERE changed_at >= NOW() - INTERVAL '${parseInt(days)} days'
  `;
  const params = [];

  if (table_name) {
    params.push(table_name);
    query += ` AND table_name = $${params.length}`;
  }

  query += ' GROUP BY table_name, action ORDER BY change_count DESC';

  const result = await pool.query(query, params);

  // Also get daily trend
  const trendQuery = `
    SELECT 
      DATE(changed_at) as change_date,
      COUNT(*) as total_changes
    FROM data_history
    WHERE changed_at >= NOW() - INTERVAL '${parseInt(days)} days'
    ${table_name ? `AND table_name = $1` : ''}
    GROUP BY DATE(changed_at)
    ORDER BY change_date DESC
  `;

  const trendResult = await pool.query(trendQuery, table_name ? [table_name] : []);

  return {
    statusCode: 200,
    body: JSON.stringify({
      statistics: result.rows,
      daily_trend: trendResult.rows
    })
  };
}

/**
 * Enable tracking for a table
 */
async function enableTracking(event, pool) {
  const { user, response: authResponse } = await requirePermission(event, 'data_history', 'create');
  if (authResponse) return authResponse;

  const { table_name } = JSON.parse(event.body || '{}');

  if (!table_name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'table_name is required' })
    };
  }

  // Create trigger
  const triggerQuery = `
    CREATE TRIGGER track_${table_name}_changes
    AFTER INSERT OR UPDATE OR DELETE ON ${table_name}
    FOR EACH ROW EXECUTE FUNCTION track_data_changes()
  `;

  try {
    await pool.query(triggerQuery);

    await logAudit(
      pool,
      user.id,
      'tracking_enabled',
      {
        table_name
      },
      event
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Tracking enabled for ${table_name}` })
    };
  } catch (error) {
    if (error.message.includes('already exists')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Tracking already enabled for this table' })
      };
    }
    throw error;
  }
}

/**
 * Main handler
 */
exports.handler = withHandler(async event => {
  try {
    await database.connect();
  } catch (err) {
    console.error('data-history: failed to connect to database', err);
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Database unavailable' })
    };
  }
  const pool = database.pool;

  try {
    const method = event.httpMethod;
    const path = event.path;

    // GET /data-history - Get all history with filters
    if (method === 'GET' && path === '/.netlify/functions/data-history') {
      return await getAllHistory(event, pool);
    }

    // GET /data-history/record - Get history for specific record
    if (method === 'GET' && path === '/.netlify/functions/data-history/record') {
      return await getRecordHistory(event, pool);
    }

    // GET /data-history/compare - Compare two versions
    if (method === 'GET' && path === '/.netlify/functions/data-history/compare') {
      return await compareVersions(event, pool);
    }

    // GET /data-history/stats - Get statistics
    if (method === 'GET' && path === '/.netlify/functions/data-history/stats') {
      return await getStats(event, pool);
    }

    // POST /data-history/:id/restore - Restore version
    if (method === 'POST' && path.match(/\/data-history\/\d+\/restore$/)) {
      return await restoreVersion(event, pool);
    }

    // POST /data-history/enable-tracking - Enable tracking for table
    if (method === 'POST' && path === '/.netlify/functions/data-history/enable-tracking') {
      return await enableTracking(event, pool);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' })
    };
  } finally {
    // keep shared pool open; do not end here
  }
});
