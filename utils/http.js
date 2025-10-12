// Shared HTTP & Auth helper for Netlify Functions
// Provides unified CORS headers, JSON responders, error helpers, body parsing, and auth enforcement.

const jwt = require('jsonwebtoken');
const { database } = require('../config/database');

// Standard permissive CORS (can be tightened later via allowlist)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
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

// --- Auth helpers ---
function getBearerToken(event){
  const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.split(' ')[1];
}

// Local JWT (HS256) verification
function verifyLocalToken(token){
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

// Minimal JWKS cache per cold start container
const jwksCache = { byKid: {}, lastFetch: 0 };
async function getAuth0PemForKid(kid){
  const domain = process.env.AUTH0_DOMAIN || '';
  if (!domain) return null;
  if (jwksCache.byKid[kid]) return jwksCache.byKid[kid];
  const jwksUrl = `https://${domain}/.well-known/jwks.json`;
  const res = await fetch(jwksUrl);
  if (!res.ok) throw new Error('Failed to fetch JWKS');
  const data = await res.json();
  const key = (data.keys || []).find(k => k.kid === kid);
  if (!key) throw new Error('JWKS key not found for kid');
  // Prefer x5c certificate chain
  if (key.x5c && key.x5c.length){
    const cert = key.x5c[0];
    const pem = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;
    jwksCache.byKid[kid] = pem;
    return pem;
  }
  // If no x5c present, we cannot easily build PEM without extra deps; fail fast
  throw new Error('Unsupported JWKS key format (no x5c)');
}

async function verifyAuth0Token(token){
  try {
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header) return null;
    const { kid, alg } = decodedHeader.header;
    if (alg !== 'RS256') return null; // Auth0 tokens are RS256 by default
    const pem = await getAuth0PemForKid(kid);
    const verified = jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: [`https://${process.env.AUTH0_DOMAIN}/`],
      audience: process.env.AUTH0_AUDIENCE || process.env.AUTH0_CLIENT_ID
    });
    return verified; // contains sub, email, name, etc.
  } catch (e){
    return null;
  }
}

async function getOrCreateUserFromClaims(claims){
  if (!claims) return null;
  const email = claims.email;
  if (!email) return null; // require email mapping for local account
  let user = await database.get('SELECT id, email, name, role, is_active, email_verified FROM users WHERE email = ?', [email]);
  if (user && user.is_active) return user;
  const autoProvision = (process.env.AUTH0_AUTO_PROVISION || 'false').toLowerCase() === 'true';
  if (!user && autoProvision){
    const name = (claims.name && String(claims.name).slice(0, 100)) || email.split('@')[0];
    const verified = claims.email_verified ? 1 : 0;
    const result = await database.run('INSERT INTO users (email, name, role, email_verified, is_active) VALUES (?, ?, ?, ?, ?)', [email, name, 'user', verified, 1]);
    user = await database.get('SELECT id, email, name, role, is_active, email_verified FROM users WHERE id = ?', [result.id]);
    return user;
  }
  return null;
}

async function authenticate(event) {
  const token = getBearerToken(event);
  if (!token) return null;
  // Try local JWT first
  const decodedLocal = verifyLocalToken(token);
  if (decodedLocal && decodedLocal.userId){
    try {
      const user = await database.get('SELECT id, email, name, role, is_active, email_verified FROM users WHERE id = ?', [decodedLocal.userId]);
      if (!user || !user.is_active) return null;
      return user;
    } catch { return null; }
  }
  // Try Auth0 token
  const verifiedAuth0 = await verifyAuth0Token(token);
  if (verifiedAuth0){
    return getOrCreateUserFromClaims(verifiedAuth0);
  }
  return null;
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
