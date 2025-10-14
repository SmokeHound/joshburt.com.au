// Netlify Function: public-config
// Returns client-safe auth0 config values to enable OAuth buttons on login/register

exports.handler = async (event) => {
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

  const {
    AUTH0_DOMAIN = null,
    AUTH0_CLIENT_ID = null,
    AUTH0_AUDIENCE = null,
    DISABLE_AUTH = 'false',
  } = process.env;

  const body = {
    auth: { disabled: String(DISABLE_AUTH).toLowerCase() === 'true' },
    auth0: AUTH0_DOMAIN && AUTH0_CLIENT_ID ? {
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      audience: AUTH0_AUDIENCE || null,
    } : null,
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400'
    },
    body: JSON.stringify(body),
  };
};
