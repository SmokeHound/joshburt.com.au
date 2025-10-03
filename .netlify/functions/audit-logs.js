// Netlify Function: GET /api/audit-logs
const { database } = require('../../config/database');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    await database.connect();
    const params = [];
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const { userId, action, startDate, endDate, limit = 100, format } = event.queryStringParameters || {};

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const logs = await database.all(query, params);

    if (format === 'csv') {
      // Export as CSV
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
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'text/csv' },
        body: csvRows.join('\n'),
      };
    }

    // Default: JSON
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(logs),
    };
  } catch (error) {
    console.error('Audit log API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch audit logs', message: error.message }),
    };
  }
};
