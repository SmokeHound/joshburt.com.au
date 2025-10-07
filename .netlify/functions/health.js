// Netlify Function: GET /.netlify/functions/health (service health & DB probe)
const { database } = require('../../config/database');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
};

const respond = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', ...corsHeaders }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };
  const start = Date.now();
  try {
    // Simple DB probe: run lightweight query depending on driver
    let dbOk = false; let dbDriver = process.env.DB_TYPE || 'sqlite';
    try {
      // For sqlite / others a trivial select works
      const row = await database.get('SELECT 1 as ok');
      dbOk = !!row;
    } catch (e) {
      dbOk = false;
    }

    return respond(200, {
      status: 'ok',
      time: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      db: { ok: dbOk, driver: dbDriver },
      version: process.env.GIT_COMMIT || 'dev',
      latencyMs: Date.now() - start
    });
  } catch (err) {
    return respond(500, { status: 'error', error: 'Health check failed', latencyMs: Date.now() - start });
  }
};
