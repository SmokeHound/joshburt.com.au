// Shared function utilities to reduce duplication across Netlify Functions
// Non-breaking helpers; optional to adopt progressively.

const { corsHeaders, json, error, parseBody, requireAuth } = require('./http');

function withHandler(handler) {
  return async (event, context) => {
    try {
      if (event.httpMethod === 'OPTIONS') {return { statusCode: 204, headers: corsHeaders };}
      return await handler(event, context);
    } catch (err) {
      console.error('Function error', err);
      return error(500, 'Internal server error');
    }
  };
}

function ok(data, status = 200, headers = {}) {
  return json(status, data, headers);
}

function badRequest(message = 'Bad request') { return error(400, message); }
function unauthorized(message = 'Authentication required') { return error(401, message); }
function forbidden(message = 'Insufficient permissions') { return error(403, message); }
function notFound(message = 'Not found') { return error(404, message); }
function methodNotAllowed(message = 'Method not allowed') { return error(405, message); }

function getPagination(qs = {}, defaults = { page: 1, limit: 10 }) {
  const parsedPage = parseInt(qs.page || defaults.page, 10);
  const parsedLimit = parseInt(qs.limit || defaults.limit, 10);
  const page = Math.max(1, isNaN(parsedPage) ? defaults.page : parsedPage);
  const limit = Math.max(1, Math.min(100, isNaN(parsedLimit) ? defaults.limit : parsedLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function parseBool(v, fallback = false) {
  if (v === undefined || v === null) {return fallback;}
  if (typeof v === 'boolean') {return v;}
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

module.exports = {
  withHandler,
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  methodNotAllowed,
  getPagination,
  parseBool,
  // Re-export common helpers to avoid multiple imports in functions
  corsHeaders,
  json,
  error,
  parseBody,
  requireAuth
};
