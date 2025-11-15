// Netlify Function: public-config
// Returns client-safe auth0 config values to enable OAuth buttons on login/register
// Implements caching for improved performance

const cache = require('../../utils/cache');

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400'
      }
    };
  }

  // Try to get from cache (5 minute TTL)
  const cached = cache.get('public-config', 'auth-config');
  if (cached) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'X-Cache': 'HIT'
      },
      body: JSON.stringify(cached)
    };
  }

  const {
    AUTH0_DOMAIN = null,
    AUTH0_CLIENT_ID = null,
    AUTH0_AUDIENCE = null,
    DISABLE_AUTH = 'false'
  } = process.env;

  const body = {
    auth: { disabled: String(DISABLE_AUTH).toLowerCase() === 'true' },
    auth0:
      AUTH0_DOMAIN && AUTH0_CLIENT_ID
        ? {
            domain: AUTH0_DOMAIN,
            clientId: AUTH0_CLIENT_ID,
            audience: AUTH0_AUDIENCE || null
          }
        : null
  };

  // Cache for 5 minutes (300 seconds)
  cache.set('public-config', 'auth-config', body, 300);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'X-Cache': 'MISS'
    },
    body: JSON.stringify(body)
  };
};
