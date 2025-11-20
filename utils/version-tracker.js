/**
 * Version Tracker Utility
 * Helper functions for tracking data changes and versions
 * Part of Phase 4: Data Management
 */

/**
 * Set the current user ID for tracking changes
 * This should be called before any database operation that should be tracked
 */
async function setCurrentUser(pool, userId) {
  if (userId) {
    await pool.query(`SET LOCAL app.current_user_id = '${userId}'`);
  }
}

/**
 * Clear the current user ID
 */
async function clearCurrentUser(pool) {
  await pool.query('RESET app.current_user_id');
}

/**
 * Execute a tracked operation
 * Wraps a database operation with user context for tracking
 */
async function withTracking(pool, userId, operation) {
  try {
    await setCurrentUser(pool, userId);
    const result = await operation();
    return result;
  } finally {
    await clearCurrentUser(pool);
  }
}

/**
 * Enable tracking for a specific table
 */
async function enableTableTracking(pool, tableName) {
  const triggerName = `track_${tableName}_changes`;

  // Check if trigger already exists
  const checkQuery = `
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = $1 AND tgrelid = $2::regclass
    )
  `;

  const exists = await pool.query(checkQuery, [triggerName, tableName]);

  if (exists.rows[0].exists) {
    return { enabled: false, message: 'Tracking already enabled' };
  }

  // Create trigger
  const createTrigger = `
    CREATE TRIGGER ${triggerName}
    AFTER INSERT OR UPDATE OR DELETE ON ${tableName}
    FOR EACH ROW EXECUTE FUNCTION track_data_changes()
  `;

  await pool.query(createTrigger);

  return { enabled: true, message: 'Tracking enabled successfully' };
}

/**
 * Disable tracking for a specific table
 */
async function disableTableTracking(pool, tableName) {
  const triggerName = `track_${tableName}_changes`;

  const dropTrigger = `DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName}`;
  await pool.query(dropTrigger);

  return { disabled: true, message: 'Tracking disabled successfully' };
}

/**
 * Get list of tables with tracking enabled
 */
async function getTrackedTables(pool) {
  const query = `
    SELECT 
      t.tgrelid::regclass AS table_name,
      t.tgname AS trigger_name,
      t.tgenabled AS enabled
    FROM pg_trigger t
    WHERE t.tgname LIKE 'track_%_changes'
    ORDER BY table_name
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get change summary for a record
 */
async function getRecordChangeSummary(pool, tableName, recordId) {
  const query = `
    SELECT 
      action,
      COUNT(*) as count,
      MIN(changed_at) as first_change,
      MAX(changed_at) as last_change,
      COUNT(DISTINCT changed_by) as users_involved
    FROM data_history
    WHERE table_name = $1 AND record_id = $2
    GROUP BY action
  `;

  const result = await pool.query(query, [tableName, recordId]);
  return result.rows;
}

/**
 * Get most recent version of a record
 */
async function getLatestVersion(pool, tableName, recordId) {
  const query = `
    SELECT *
    FROM data_history
    WHERE table_name = $1 AND record_id = $2
    ORDER BY changed_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [tableName, recordId]);
  return result.rows[0] || null;
}

/**
 * Compare two versions and return differences
 */
function compareVersions(oldData, newData) {
  const differences = [];
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      differences.push({
        field: key,
        old_value: oldValue,
        new_value: newValue,
        changed: true
      });
    }
  }

  return differences;
}

/**
 * Get change timeline for a record
 */
async function getChangeTimeline(pool, tableName, recordId) {
  const query = `
    SELECT 
      h.id,
      h.action,
      h.changed_at,
      h.changed_fields,
      u.email as changed_by_email,
      u.full_name as changed_by_name
    FROM data_history h
    LEFT JOIN users u ON h.changed_by = u.id
    WHERE h.table_name = $1 AND h.record_id = $2
    ORDER BY h.changed_at ASC
  `;

  const result = await pool.query(query, [tableName, recordId]);
  return result.rows;
}

/**
 * Revert to a specific version
 */
async function revertToVersion(pool, historyId, userId) {
  // Get the version
  const historyQuery = 'SELECT * FROM data_history WHERE id = $1';
  const historyResult = await pool.query(historyQuery, [historyId]);

  if (historyResult.rows.length === 0) {
    throw new Error('Version not found');
  }

  const version = historyResult.rows[0];
  const dataToRestore = version.new_data || version.old_data;

  if (!dataToRestore) {
    throw new Error('No data available to restore');
  }

  // Build and execute update
  const columns = Object.keys(dataToRestore).filter(k => k !== 'id');
  const setClause = columns.map((col, idx) => `${col} = $${idx + 1}`).join(', ');
  const values = columns.map(col => dataToRestore[col]);
  values.push(version.record_id);

  const updateQuery = `
    UPDATE ${version.table_name}
    SET ${setClause}
    WHERE id = $${values.length}
    RETURNING *
  `;

  return await withTracking(pool, userId, async () => {
    const result = await pool.query(updateQuery, values);
    return result.rows[0];
  });
}

/**
 * Bulk revert multiple records to previous state
 */
async function bulkRevert(pool, historyIds, userId) {
  const results = {
    success: [],
    failed: []
  };

  for (const historyId of historyIds) {
    try {
      const reverted = await revertToVersion(pool, historyId, userId);
      results.success.push({ historyId, record: reverted });
    } catch (error) {
      results.failed.push({ historyId, error: error.message });
    }
  }

  return results;
}

module.exports = {
  setCurrentUser,
  clearCurrentUser,
  withTracking,
  enableTableTracking,
  disableTableTracking,
  getTrackedTables,
  getRecordChangeSummary,
  getLatestVersion,
  compareVersions,
  getChangeTimeline,
  revertToVersion,
  bulkRevert
};
