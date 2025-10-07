// Shared HTTP & Auth helper for Netlify Functions
// Provides unified CORS headers, JSON responders, error helpers, body parsing, and auth enforcement.

const jwt = require('jsonwebtoken');
const { database } = require('../config/database');

// Standard permissive CORS (can be tightened later via allowlist)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...extraHeaders },
    body: JSON.stringify(body)
  };
}

function error(statusCode, message, extra = {}, extraHeaders = {}) {
  return json(statusCode, { error: message, ...extra }, extraHeaders);
}

function parseBody(event) {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return {}; }
}

async function authenticate(event) {
  try {
    const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
    if (!auth) return null;
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await database.get('SELECT id, email, name, role, is_active, email_verified FROM users WHERE id = ?', [decoded.userId]);
    if (!user || !user.is_active) return null;
    return user;
  } catch {
    return null;
  }
}

async function requireAuth(event, roles = null) {
  const user = await authenticate(event);
  if (!user) return { user: null, response: error(401, 'Authentication required') };
  if (roles && !roles.includes(user.role)) return { user, response: error(403, 'Insufficient permissions') };
  return { user, response: null };
}

module.exports = {
  corsHeaders,
  json,
  error,
  parseBody,
  authenticate,
  requireAuth
};
