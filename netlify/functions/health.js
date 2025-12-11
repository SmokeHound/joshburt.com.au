// Netlify Function: GET /.netlify/functions/health (service health & DB probe)
const { database, initializeDatabase } = require('../../config/database');
const { withHandler, ok, error } = require('../../utils/fn');
const packageJson = require('../../package.json');

let dbInitialized = false;
let startupTime = Date.now();

exports.handler = withHandler(async event => {
  const start = Date.now();
  try {
    // Connect and initialize database (once per cold start)
    if (!dbInitialized) {
      await database.connect();
      try {
        await initializeDatabase();
      } catch (e) {
        // Log initialization errors but continue if tables already exist
        if (e.message && !e.message.includes('already exists')) {
          console.warn('Database initialization warning:', e.message);
        }
      }
      dbInitialized = true;
    }

    let dbOk = false;
    let dbLatency = 0;
    const dbDriver = 'postgres';

    try {
      const dbStart = Date.now();
      const row = await database.get('SELECT 1 as ok');
      dbLatency = Date.now() - dbStart;
      dbOk = !!row;
    } catch (_) {
      dbOk = false;
    }

    // Check environment
    const environment = process.env.NODE_ENV || 'development';
    const isDevelopment = environment === 'development';

    // Memory usage (in MB)
    const memUsage = process.memoryUsage();
    const memory = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    };

    // System information
    const uptimeSeconds = Math.floor(process.uptime());
    const containerUptime = Math.floor((Date.now() - startupTime) / 1000);

    // Health status determination
    const checks = {
      database: dbOk,
      memory: memory.heapUsed < 400, // Alert if heap > 400MB
      responseTime: dbLatency < 1000 // Alert if DB query > 1s
    };

    const allChecksPass = Object.values(checks).every(check => check === true);
    const status = allChecksPass ? 'healthy' : 'degraded';

    const response = {
      status,
      timestamp: new Date().toISOString(),
      environment,
      version: packageJson.version || '1.11.0',
      uptime: {
        processSeconds: uptimeSeconds,
        containerSeconds: containerUptime
      },
      database: {
        status: dbOk ? 'connected' : 'disconnected',
        driver: dbDriver,
        latencyMs: dbLatency
      },
      memory: {
        ...memory,
        unit: 'MB'
      },
      checks,
      latencyMs: Date.now() - start
    };

    // Add detailed error tracking info if Sentry is configured
    if (process.env.SENTRY_DSN) {
      response.monitoring = {
        errorTracking: 'enabled',
        environment: process.env.SENTRY_ENVIRONMENT || environment
      };
    }

    // Return appropriate status code based on health
    return ok(response, status === 'healthy' ? 200 : 503);
  } catch (e) {
    return error(500, 'Health check failed', {
      error: e.message,
      latencyMs: Date.now() - start
    });
  }
});
