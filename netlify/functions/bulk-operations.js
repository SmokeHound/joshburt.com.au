/**
 * Bulk Operations API Endpoint
 * Handles bulk import, export, update, and delete operations
 * Part of Phase 4: Data Management
 */

const { Pool } = require('../../config/database');
const { withHandler } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const { logAudit } = require('../../utils/audit');

/**
 * Parse CSV data
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || null;
    });
    return row;
  });

  return { headers, rows };
}

/**
 * Validate row data against table schema
 */
async function validateRow(pool, tableName, row, rowIndex) {
  const errors = [];

  // Get table columns (basic validation)
  const schemaQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = $1
  `;
  const schema = await pool.query(schemaQuery, [tableName]);
  const columns = schema.rows;

  // Check required fields
  for (const col of columns) {
    if (col.is_nullable === 'NO' && col.column_name !== 'id' && !row[col.column_name]) {
      errors.push({
        row: rowIndex,
        field: col.column_name,
        message: `Required field '${col.column_name}' is missing`
      });
    }
  }

  return errors;
}

/**
 * List bulk operations
 */
async function listOperations(event, pool) {
  await requirePermission(event, 'bulk_operations', 'read');

  const { status, target_table, limit = 50, offset = 0 } = event.queryStringParameters || {};

  let query = 'SELECT * FROM bulk_operations WHERE 1=1';
  const params = [];

  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }

  if (target_table) {
    params.push(target_table);
    query += ` AND target_table = $${params.length}`;
  }

  query += ' ORDER BY started_at DESC';
  params.push(parseInt(limit));
  query += ` LIMIT $${params.length}`;
  params.push(parseInt(offset));
  query += ` OFFSET $${params.length}`;

  const result = await pool.query(query, params);

  // Get total count
  const countResult = await pool.query('SELECT COUNT(*) FROM bulk_operations');

  return {
    statusCode: 200,
    body: JSON.stringify({
      operations: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  };
}

/**
 * Create bulk import operation
 */
async function createImport(event, pool) {
  const user = await requirePermission(event, 'bulk_operations', 'create');

  const { target_table, format, data, validate_only = false } = JSON.parse(event.body || '{}');

  // Validate table name
  const validTables = ['products', 'consumables', 'filters', 'users'];
  if (!validTables.includes(target_table)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `Invalid target_table. Must be one of: ${validTables.join(', ')}`
      })
    };
  }

  // Parse data based on format
  let rows = [];
  if (format === 'csv') {
    const parsed = parseCSV(data);
    rows = parsed.rows;
  } else if (format === 'json') {
    rows = JSON.parse(data);
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid format. Must be: csv or json' })
    };
  }

  // Validate all rows
  const validationErrors = [];
  for (let i = 0; i < rows.length; i++) {
    const errors = await validateRow(pool, target_table, rows[i], i + 1);
    validationErrors.push(...errors);
  }

  if (validationErrors.length > 0 && !validate_only) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Validation failed',
        validation_errors: validationErrors
      })
    };
  }

  // If validate_only, return validation results
  if (validate_only) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: validationErrors.length === 0,
        total_records: rows.length,
        validation_errors: validationErrors,
        preview_data: rows.slice(0, 5) // First 5 rows as preview
      })
    };
  }

  // Create bulk operation record
  const result = await pool.query(
    `INSERT INTO bulk_operations (
      operation_type, target_table, format, total_records, 
      created_by, status, preview_data
    ) VALUES ($1, $2, $3, $4, $5, 'pending', $6)
    RETURNING *`,
    ['import', target_table, format, rows.length, user.id, JSON.stringify(rows.slice(0, 5))]
  );

  const operation = result.rows[0];

  await logAudit(
    pool,
    user.id,
    'bulk_import_created',
    {
      operation_id: operation.id,
      target_table,
      total_records: rows.length
    },
    event
  );

  return {
    statusCode: 201,
    body: JSON.stringify(operation)
  };
}

/**
 * Execute bulk operation
 */
async function executeOperation(event, pool) {
  const user = await requirePermission(event, 'bulk_operations', 'update');

  const operationId = event.path.split('/').pop();
  const { data } = JSON.parse(event.body || '{}');

  // Get operation details
  const opResult = await pool.query('SELECT * FROM bulk_operations WHERE id = $1', [operationId]);

  if (opResult.rows.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Operation not found' })
    };
  }

  const operation = opResult.rows[0];

  // Update status to processing
  await pool.query('UPDATE bulk_operations SET status = $1 WHERE id = $2', [
    'processing',
    operationId
  ]);

  // Parse data
  let rows = [];
  if (operation.format === 'csv') {
    const parsed = parseCSV(data);
    rows = parsed.rows;
  } else if (operation.format === 'json') {
    rows = JSON.parse(data);
  }

  let successCount = 0;
  let errorCount = 0;
  const errorLog = [];

  // Execute import
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const columns = Object.keys(row).filter(k => row[k] !== null);
      const values = columns.map(k => row[k]);
      const placeholders = columns.map((_, idx) => `$${idx + 1}`);

      const query = `
        INSERT INTO ${operation.target_table} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `;

      await pool.query(query, values);
      successCount++;
    } catch (error) {
      errorCount++;
      errorLog.push({
        row: i + 1,
        error: error.message
      });
    }
  }

  // Update operation with results
  await pool.query(
    `UPDATE bulk_operations 
     SET status = $1, processed_records = $2, success_count = $3, 
         error_count = $4, error_log = $5, completed_at = NOW(), committed = TRUE
     WHERE id = $6`,
    [
      errorCount === 0 ? 'completed' : 'completed',
      rows.length,
      successCount,
      errorCount,
      JSON.stringify(errorLog),
      operationId
    ]
  );

  await logAudit(
    pool,
    user.id,
    'bulk_import_executed',
    {
      operation_id: operationId,
      success_count: successCount,
      error_count: errorCount
    },
    event
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      processed: rows.length,
      success_count: successCount,
      error_count: errorCount,
      errors: errorLog
    })
  };
}

/**
 * Export data
 */
async function exportData(event, pool) {
  await requirePermission(event, 'bulk_operations', 'read');

  const { target_table, format = 'csv', filters = {} } = event.queryStringParameters || {};

  // Validate table
  const validTables = ['products', 'consumables', 'filters', 'users', 'orders'];
  if (!validTables.includes(target_table)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid target_table' })
    };
  }

  // Build query
  let query = `SELECT * FROM ${target_table}`;
  const params = [];

  // Add basic filters if provided
  const whereClause = [];
  if (filters.status) {
    params.push(filters.status);
    whereClause.push(`status = $${params.length}`);
  }

  if (whereClause.length > 0) {
    query += ` WHERE ${whereClause.join(' AND ')}`;
  }

  const result = await pool.query(query, params);

  // Format output
  let output;
  if (format === 'json') {
    output = JSON.stringify(result.rows, null, 2);
  } else if (format === 'csv') {
    if (result.rows.length === 0) {
      output = '';
    } else {
      const headers = Object.keys(result.rows[0]);
      const csvRows = [headers.join(',')];

      for (const row of result.rows) {
        const values = headers.map(h => {
          const value = row[h];
          if (value === null) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }

      output = csvRows.join('\n');
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': format === 'json' ? 'application/json' : 'text/csv',
      'Content-Disposition': `attachment; filename="${target_table}_export.${format}"`
    },
    body: output
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

    // GET /bulk-operations - List operations
    if (method === 'GET' && path === '/.netlify/functions/bulk-operations') {
      return await listOperations(event, pool);
    }

    // GET /bulk-operations/export - Export data
    if (method === 'GET' && path === '/.netlify/functions/bulk-operations/export') {
      return await exportData(event, pool);
    }

    // POST /bulk-operations - Create import operation
    if (method === 'POST' && path === '/.netlify/functions/bulk-operations') {
      return await createImport(event, pool);
    }

    // POST /bulk-operations/:id/execute - Execute operation
    if (method === 'POST' && path.match(/\/bulk-operations\/\d+\/execute$/)) {
      return await executeOperation(event, pool);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' })
    };
  } finally {
    await pool.end();
  }
});
