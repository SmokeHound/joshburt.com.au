// Netlify Function: GET /api/consumable-categories
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
    const rows = await database.all('SELECT DISTINCT category FROM consumables WHERE category IS NOT NULL AND category != "" ORDER BY category');
    const categories = rows.map(r => r.category);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(categories),
    };
  } catch (error) {
    console.error('Consumable categories API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch categories', message: error.message }),
    };
  }
};
