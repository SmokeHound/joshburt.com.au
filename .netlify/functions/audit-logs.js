// Netlify Function: GET/POST/DELETE /.netlify/functions/audit-logs
// Enhancements: pagination (page,limit), free-text search (q across action/details/user_id), CSV export, delete with cutoff.
const { database } = require('../../config/database');
const { withHandler, ok, error, parseBody, getPagination } = require('../../utils/fn');
const { corsHeaders, requirePermission } = require('../../utils/http');

exports.handler = withHandler(async function(event){
  try { await database.connect(); } catch (e) { return error(500, 'DB connection failed', { message: e.message }); }

  const method = event.httpMethod;
  if (method === 'POST') return handlePost(event);
  if (method === 'DELETE') return handleDelete(event);
  if (method !== 'GET') return error(405, 'Method Not Allowed');
  return handleGet(event);

  async function handlePost(event){
    // Only admins can create audit logs manually (normally auto-created)
    const { user, response: authResponse } = await requirePermission(event, 'auditLogs', 'read');
    if (authResponse) return authResponse;
    
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
    // Only admins can delete audit logs
    const { user, response: authResponse } = await requirePermission(event, 'auditLogs', 'read');
    if (authResponse) return authResponse;
    
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
    // Only admins can view audit logs
    const { user, response: authResponse } = await requirePermission(event, 'auditLogs', 'read');
    if (authResponse) return authResponse;
    
    try {
      const { userId, action, startDate, endDate, limit, format, q, method, path, requestId } = event.queryStringParameters || {};
      const { page, limit: pageLimit, offset } = getPagination(event.queryStringParameters || {}, { page: 1, limit: 25 });
      const hasPagination = !!(event.queryStringParameters && (event.queryStringParameters.page || event.queryStringParameters.limit));

      const whereParts = ['1=1'];
      const params = [];
      if (userId) { whereParts.push('user_id = ?'); params.push(userId); }
      if (action) { whereParts.push('action = ?'); params.push(action); }
      if (startDate) { whereParts.push('created_at >= ?'); params.push(startDate); }
      if (endDate) { whereParts.push('created_at <= ?'); params.push(endDate); }
      if (method) { whereParts.push('details LIKE ?'); params.push(`%"method":"${method}"%`); }
      if (path) { whereParts.push('details LIKE ?'); params.push(`%"path":"${path}"%`); }
      if (requestId) { whereParts.push('details LIKE ?'); params.push(`%"requestId":"${requestId}"%`); }
      if (q) {
        whereParts.push('(action LIKE ? OR details LIKE ? OR user_id LIKE ?)');
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
