// Centralized audit logging helper
// Collects request context and stores as JSON in audit_logs.details
// Usage: await logAudit(event, { action: 'order.create', userId, details: { orderId } })

const { database } = require('../config/database');

function getHeader(event, key) {
  const h = event && event.headers ? event.headers : {};
  return h[key] || h[key?.toLowerCase?.()] || h[key?.toUpperCase?.()] || '';
}

function getIp(event) {
  const h = event && event.headers ? event.headers : {};
  return (
    h['x-forwarded-for'] ||
    h['client-ip'] ||
    h['x-real-ip'] ||
    ''
  );
}

async function logAudit(event, { action, userId = null, details = {} } = {}) {
  if (!action) {return;}
  try {
    // Check if database is connected
    if (!database.pool) {
      console.warn('⚠️ Audit log skipped: database not connected');
      return;
    }
    
    const method = event && event.httpMethod;
    const path = event && event.path;
    const qs = (event && event.queryStringParameters) || null;
    const ip = getIp(event);
    const ua = getHeader(event, 'user-agent');
    const referrer = getHeader(event, 'referer') || getHeader(event, 'referrer');
    const origin = getHeader(event, 'origin');
    const requestId = getHeader(event, 'x-nf-request-id') || getHeader(event, 'x-request-id');
    const enriched = {
      ...details,
      method,
      path,
      query: qs,
      referrer,
      origin,
      requestId
    };
    const insert = 'INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)';
    const params = [userId, action, JSON.stringify(enriched), ip, ua];
    await database.run(insert, params);
  } catch (err) {
    // Non-fatal: audit logging must not break primary flow
    console.warn('⚠️ Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
