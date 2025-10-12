// Netlify Function: public-config
// Returns client-safe auth0 config values to enable OAuth buttons on login/register

exports.handler = async () => {
  const {
    AUTH0_DOMAIN = null,
    AUTH0_CLIENT_ID = null,
    AUTH0_AUDIENCE = null,
  } = process.env;

  const body = {
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
    },
    body: JSON.stringify(body),
  };
};
