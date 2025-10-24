// Netlify Function: GET/POST/DELETE /.netlify/functions/audit-logs
// Enhancements: pagination (page,limit), free-text search (q across action/details/user_id), CSV export, delete with cutoff.
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody, getPagination } = require('../../utils/fn');
const { corsHeaders } = require('../../utils/http');

exports.handler = withHandler(async function(event){
  try { await database.connect(); } catch (e) { return error(500, 'DB connection failed', { message: e.message }); }

  const method = event.httpMethod;
  if (method === 'POST') return handlePost(event);
  if (method === 'DELETE') return handleDelete(event);
  if (method !== 'GET') return error(405, 'Method Not Allowed');
  return handleGet(event);

  async function handlePost(event){
    try {
      const body = parseBody(event);
      const action = body.action || '';
      if (!action) return error(400, 'Missing action');
      const user_id = body.userId || null;
      const details = body.details || '';
      const ip_address = body.ip_address || (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'] || '')) || '';
      const user_agent = body.user_agent || (event.headers && (event.headers['user-agent'] || '')) || '';
      const insert = 'INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)';
      const params = [user_id, action, typeof details === 'string' ? details : JSON.stringify(details), ip_address, user_agent];
      await database.run(insert, params);
      return ok({ message: 'Audit log entry created' }, 201);
    } catch (e) {
      console.error('Audit log POST error:', e);
      return error(500, 'Failed to create audit log', { message: e.message });
    }
  }

  async function handleDelete(event){
    try {
      const { olderThanDays } = event.queryStringParameters || {};
      if (olderThanDays) {
        const days = parseInt(olderThanDays);
        if (isNaN(days) || days < 0) return error(400, 'Invalid olderThanDays');
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        await database.run('DELETE FROM audit_logs WHERE created_at < ?', [cutoff]);
        return ok({ message: 'Old audit logs cleared', olderThanDays: days });
      }
      await database.run('DELETE FROM audit_logs', []);
      return ok({ message: 'All audit logs cleared' });
    } catch (e) {
      console.error('Audit log DELETE error:', e);
      return error(500, 'Failed to delete logs', { message: e.message });
    }
  }

  async function handleGet(event){
    try {
      const { userId, action, startDate, endDate, limit, format, q, method, path, requestId, from, to } = event.queryStringParameters || {};
      const qs = event.queryStringParameters || {};
      // Support page and limit; treat pageSize as alias of limit for UI compatibility
      const effectiveQs = { ...qs };
      if (!effectiveQs.limit && effectiveQs.pageSize) effectiveQs.limit = effectiveQs.pageSize;
      const { page, limit: pageLimit, offset } = getPagination(effectiveQs, { page: 1, limit: 25 });
      const hasPagination = !!(event.queryStringParameters && (event.queryStringParameters.page || event.queryStringParameters.limit));

      const whereParts = ['1=1'];
      const params = [];
      // Helper to build JSON extraction in a cross-DB way
      const dbType = (database.type || '').toLowerCase();
      const j = (key) => dbType.startsWith('postg') ? `(details::json->>'${key}')` : `json_extract(details, '$.${key}')`;
      if (userId) { whereParts.push('user_id = ?'); params.push(userId); }
      if (action) { whereParts.push('action = ?'); params.push(action); }
      const start = startDate || from;
      const end = endDate || to;
      if (start) { whereParts.push('created_at >= ?'); params.push(start); }
      if (end) { whereParts.push('created_at <= ?'); params.push(end); }
      if (method) { whereParts.push(`${j('method')} = ?`); params.push(method); }
      if (path) { whereParts.push(`${j('path')} = ?`); params.push(path); }
      if (requestId) { whereParts.push(`${j('requestId')} = ?`); params.push(requestId); }
      if (q) {
        whereParts.push('(action LIKE ? OR details LIKE ? OR CAST(user_id AS TEXT) LIKE ?)');
        const like = `%${q}%`;
        params.push(like, like, like);
      }

      let base = `FROM audit_logs WHERE ${whereParts.join(' AND ')}`;
      let total = null;
      if (hasPagination) {
        const countRow = await database.get(`SELECT COUNT(*) as cnt ${base}`, params);
        total = countRow ? countRow.cnt : 0;
      }

      let dataQuery = `SELECT * ${base} ORDER BY created_at DESC`;
      if (hasPagination) {
        dataQuery += ' LIMIT ? OFFSET ?';
        params.push(pageLimit, offset);
      } else {
        const effLimit = parseInt(limit || '100');
        dataQuery += ' LIMIT ?';
        params.push(effLimit);
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
            '"' + (log.details ? String(log.details).replace(/"/g, '""') : '') + '"',
            log.ip_address,
            '"' + (log.user_agent ? String(log.user_agent).replace(/"/g, '""') : '') + '"',
            log.created_at
          ].join(','));
        }
        return { statusCode: 200, headers: { 'Content-Type': 'text/csv', ...corsHeaders }, body: csvRows.join('\n') };
      }

      if (hasPagination) {
        return ok({ data: logs, pagination: { page, pageSize: pageLimit, total, totalPages: Math.ceil(total / pageLimit) || 0 } });
      }
      return ok(logs);
    } catch (e) {
      console.error('Audit log GET error:', e);
      return error(500, 'Failed to fetch audit logs', { message: e.message });
    }
  }
});
