/**
 * Backups API Endpoint
 * Manages database backup and export operations
 * Part of Phase 4: Data Management
 */

const { Pool } = require('../../config/database');
const { withHandler } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const { logAudit } = require('../../utils/audit');

/**
 * List backups with pagination and filtering
 */
async function listBackups(event, pool) {
  await requirePermission(event, 'backups', 'read');

  const { status, backup_type, limit = 50, offset = 0 } = event.queryStringParameters || {};

  let query = 'SELECT * FROM backups WHERE 1=1';
  const params = [];

  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }

  if (backup_type) {
    params.push(backup_type);
    query += ` AND backup_type = $${params.length}`;
  }

  query += ' ORDER BY started_at DESC';
  params.push(parseInt(limit));
  query += ` LIMIT $${params.length}`;
  params.push(parseInt(offset));
  query += ` OFFSET $${params.length}`;

  const result = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM backups WHERE 1=1';
  const countParams = [];
  if (status) {
    countParams.push(status);
    countQuery += ` AND status = $${countParams.length}`;
  }
  if (backup_type) {
    countParams.push(backup_type);
    countQuery += ` AND backup_type = $${countParams.length}`;
  }
  const countResult = await pool.query(countQuery, countParams);

  return {
    statusCode: 200,
    body: JSON.stringify({
      backups: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  };
}

/**
 * Get specific backup details
 */
async function getBackup(event, pool) {
  await requirePermission(event, 'backups', 'read');

  const backupId = event.path.split('/').pop();
  const result = await pool.query('SELECT * FROM backups WHERE id = $1', [backupId]);

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Backup not found' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.rows[0])
  };
}

/**
 * Create new backup
 */
async function createBackup(event, pool) {
  const user = await requirePermission(event, 'backups', 'create');

  const {
    backup_type,
    format = 'sql',
    compression = 'gzip',
    tables = []
  } = JSON.parse(event.body || '{}');

  // Validate backup type
  const validTypes = ['full', 'incremental', 'table'];
  if (!validTypes.includes(backup_type)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid backup_type. Must be: full, incremental, or table' })
    };
  }

  // Validate format
  const validFormats = ['sql', 'json', 'csv'];
  if (!validFormats.includes(format)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid format. Must be: sql, json, or csv' })
    };
  }

  // For table backups, require at least one table
  if (backup_type === 'table' && (!tables || tables.length === 0)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Table backup requires at least one table name' })
    };
  }

  // Insert backup record
  const result = await pool.query(
    `INSERT INTO backups (backup_type, format, compression, tables, created_by, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [backup_type, format, compression, tables, user.id]
  );

  const backup = result.rows[0];

  // Log audit
  await logAudit(
    pool,
    user.id,
    'backup_created',
    {
      backup_id: backup.id,
      backup_type,
      format,
      tables
    },
    event
  );

  return {
    statusCode: 201,
    body: JSON.stringify(backup)
  };
}

/**
 * Update backup status (used by backup worker)
 */
async function updateBackup(event, pool) {
  const user = await requirePermission(event, 'backups', 'update');

  const backupId = event.path.split('/').pop();
  const { status, file_path, file_size, error_message, completed_at, metadata } = JSON.parse(
    event.body || '{}'
  );

  // Build dynamic update query
  const updates = [];
  const params = [];

  if (status) {
    params.push(status);
    updates.push(`status = $${params.length}`);
  }

  if (file_path) {
    params.push(file_path);
    updates.push(`file_path = $${params.length}`);
  }

  if (file_size !== undefined) {
    params.push(file_size);
    updates.push(`file_size = $${params.length}`);
  }

  if (error_message !== undefined) {
    params.push(error_message);
    updates.push(`error_message = $${params.length}`);
  }

  if (completed_at) {
    params.push(completed_at);
    updates.push(`completed_at = $${params.length}`);
  }

  if (metadata) {
    params.push(JSON.stringify(metadata));
    updates.push(`metadata = $${params.length}`);
  }

  if (updates.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No fields to update' })
    };
  }

  params.push(backupId);
  const query = `UPDATE backups SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Backup not found' })
    };
  }

  await logAudit(
    pool,
    user.id,
    'backup_updated',
    {
      backup_id: backupId,
      updates: { status, file_path, file_size }
    },
    event
  );

  return {
    statusCode: 200,
    body: JSON.stringify(result.rows[0])
  };
}

/**
 * Delete backup record
 */
async function deleteBackup(event, pool) {
  const user = await requirePermission(event, 'backups', 'delete');

  const backupId = event.path.split('/').pop();

  // Get backup details first
  const backup = await pool.query('SELECT * FROM backups WHERE id = $1', [backupId]);

  if (backup.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Backup not found' })
    };
  }

  // Delete the backup record
  await pool.query('DELETE FROM backups WHERE id = $1', [backupId]);

  await logAudit(
    pool,
    user.id,
    'backup_deleted',
    {
      backup_id: backupId,
      backup_type: backup.rows[0].backup_type,
      file_path: backup.rows[0].file_path
    },
    event
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Backup deleted successfully' })
  };
}

/**
 * Get backup statistics
 */
async function getBackupStats(event, pool) {
  await requirePermission(event, 'backups', 'read');

  const stats = await pool.query(`
    SELECT 
      COUNT(*) as total_backups,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'running') as running,
      SUM(file_size) FILTER (WHERE status = 'completed') as total_size,
      MAX(started_at) as last_backup_time
    FROM backups
  `);

  return {
    statusCode: 200,
    body: JSON.stringify(stats.rows[0])
  };
}

/**
 * Main handler
 */
exports.handler = withHandler(async event => {
  const pool = new Pool();

  try {
    const method = event.httpMethod;
    const path = event.path;

    // GET /backups - List backups
    if (method === 'GET' && path === '/.netlify/functions/backups') {
      return await listBackups(event, pool);
    }

    // GET /backups/stats - Get statistics
    if (method === 'GET' && path === '/.netlify/functions/backups/stats') {
      return await getBackupStats(event, pool);
    }

    // GET /backups/:id - Get specific backup
    if (method === 'GET' && path.match(/\/backups\/\d+$/)) {
      return await getBackup(event, pool);
    }

    // POST /backups - Create new backup
    if (method === 'POST' && path === '/.netlify/functions/backups') {
      return await createBackup(event, pool);
    }

    // PUT /backups/:id - Update backup
    if (method === 'PUT' && path.match(/\/backups\/\d+$/)) {
      return await updateBackup(event, pool);
    }

    // DELETE /backups/:id - Delete backup
    if (method === 'DELETE' && path.match(/\/backups\/\d+$/)) {
      return await deleteBackup(event, pool);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' })
    };
  } finally {
    await pool.end();
  }
});
