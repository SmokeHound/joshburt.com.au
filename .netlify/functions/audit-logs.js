// Netlify Function: GET/POST/DELETE /.netlify/functions/audit-logs
// Enhancements: pagination (page,pageSize), free-text search (q across action/details/user_id), CSV export, delete with cutoff.
const { database } = require('../../config/database');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await database.connect();
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'DB connection failed', message: e.message }) };
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const action = body.action || '';
      if (!action) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing action' }) };
      const user_id = body.userId || null;
      const details = body.details || '';
      const ip_address = body.ip_address || (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'] || '')) || '';
      const user_agent = body.user_agent || (event.headers && (event.headers['user-agent'] || '')) || '';
      const insert = 'INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)';
      const params = [user_id, action, typeof details === 'string' ? details : JSON.stringify(details), ip_address, user_agent];
      await database.run(insert, params);
      return { statusCode: 201, headers, body: JSON.stringify({ message: 'Audit log entry created' }) };
    } catch (error) {
      console.error('Audit log POST error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create audit log', message: error.message }) };
    }
  }

  if (event.httpMethod === 'DELETE') {
    try {
      const { olderThanDays } = event.queryStringParameters || {};
      if (olderThanDays) {
        const days = parseInt(olderThanDays);
        if (isNaN(days) || days < 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid olderThanDays' }) };
        }
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const del = 'DELETE FROM audit_logs WHERE created_at < ?';
        const res = await database.run(del, [cutoff]);
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'Old audit logs cleared', olderThanDays: days }) };
      } else {
        await database.run('DELETE FROM audit_logs', []);
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'All audit logs cleared' }) };
      }
    } catch (error) {
      console.error('Audit log DELETE error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete logs', message: error.message }) };
    }
  }

  // GET with filtering, search, pagination
  try {
    const {
      userId, action, startDate, endDate, limit, format, page, pageSize, q
    } = event.queryStringParameters || {};

    const hasPagination = page || pageSize; // if either specified we return object { data, pagination }
    const effectivePage = parseInt(page || '1');
    const effectivePageSize = parseInt(pageSize || '25');
    const maxPageSize = 200;
    const finalPageSize = Math.min(Math.max(effectivePageSize, 1), maxPageSize);

    const whereParts = ['1=1'];
    const params = [];
    if (userId) { whereParts.push('user_id = ?'); params.push(userId); }
    if (action) { whereParts.push('action = ?'); params.push(action); }
    if (startDate) { whereParts.push('created_at >= ?'); params.push(startDate); }
    if (endDate) { whereParts.push('created_at <= ?'); params.push(endDate); }
    if (q) { // free text across action, details, user_id
      whereParts.push('(action LIKE ? OR details LIKE ? OR user_id LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    let baseQuery = `FROM audit_logs WHERE ${whereParts.join(' AND ')}`;

    // Count total for pagination
    let total = null;
    if (hasPagination) {
      const countRow = await database.get(`SELECT COUNT(*) as cnt ${baseQuery}`, params);
      total = countRow ? countRow.cnt : 0;
    }

    let dataQuery = `SELECT * ${baseQuery} ORDER BY created_at DESC`;
    if (hasPagination) {
      const offset = (effectivePage - 1) * finalPageSize;
      dataQuery += ' LIMIT ? OFFSET ?';
      params.push(finalPageSize, offset);
    } else {
      // backwards compatibility: simple limit param as before (default 100)
      const effectiveLimit = parseInt(limit || '100');
      dataQuery += ' LIMIT ?';
      params.push(effectiveLimit);
    }

    const logs = await database.all(dataQuery, params);

    if (format === 'csv') {
      const csvHeaders = ['id','user_id','action','details','ip_address','user_agent','created_at'];
      const csvRows = [csvHeaders.join(',')];
      for (const log of logs) {
        csvRows.push([
          log.id,
          log.user_id,
          log.action,
          '"' + (log.details ? log.details.replace(/"/g, '""') : '') + '"',
          log.ip_address,
          '"' + (log.user_agent ? log.user_agent.replace(/"/g, '""') : '') + '"',
          log.created_at
        ].join(','));
      }
      return { statusCode: 200, headers: { ...headers, 'Content-Type': 'text/csv' }, body: csvRows.join('\n') };
    }

    if (hasPagination) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: logs,
          pagination: {
            page: effectivePage,
            pageSize: finalPageSize,
            total,
            totalPages: Math.ceil(total / finalPageSize) || 0
          }
        })
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify(logs) };
  } catch (error) {
    console.error('Audit log GET error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch audit logs', message: error.message }) };
  }
};
