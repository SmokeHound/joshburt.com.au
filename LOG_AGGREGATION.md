# Log Aggregation Setup Guide

## Overview

Centralized logging for joshburt.com.au serverless functions and application events.

## Log Sources

1. **Netlify Function Logs**: Serverless function execution logs
2. **Database Logs**: PostgreSQL query logs (from Neon)
3. **Application Logs**: Custom application events
4. **Audit Logs**: User actions and security events
5. **Error Tracking**: Sentry integration for exceptions

## Log Aggregation Solutions

### Option 1: Netlify Log Drains (Built-in)

Configure log drains to forward to external service:

```bash
# Via Netlify UI: Site settings → Build & deploy → Log drains
# Or via netlify.toml
```

Add to `netlify.toml`:

```toml
[[plugins]]
  package = "@netlify/plugin-lighthouse"

[build.environment]
  NETLIFY_LOG_LEVEL = "debug"
```

### Option 2: Papertrail

**Setup**:

1. Create account at [Papertrail](https://papertrailapp.com)
2. Get log destination: `logs.papertrailapp.com:12345`
3. Configure in Netlify UI as log drain

**Benefits**:
- Free tier available
- Real-time tail
- Search and filtering
- Alerts on patterns
- 7-day retention (free)

### Option 3: Datadog Logs

**Setup**:

```javascript
// In each Netlify function
const { logToDatadog } = require('../utils/datadog-logger');

exports.handler = async (event, context) => {
  logToDatadog('info', 'Function started', {
    function: context.functionName,
    requestId: context.awsRequestId
  });
  
  // Function logic...
  
  logToDatadog('info', 'Function completed', {
    function: context.functionName,
    duration: Date.now() - startTime
  });
};
```

Create `utils/datadog-logger.js`:

```javascript
const https = require('https');

function logToDatadog(level, message, meta = {}) {
  const apiKey = process.env.DATADOG_API_KEY;
  if (!apiKey) return;
  
  const logEntry = {
    ddsource: 'nodejs',
    ddtags: 'env:production,service:joshburt-functions',
    hostname: 'netlify',
    message: message,
    level: level,
    ...meta,
    timestamp: Date.now()
  };
  
  const payload = JSON.stringify(logEntry);
  
  const options = {
    hostname: 'http-intake.logs.datadoghq.com',
    port: 443,
    path: `/v1/input/${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };
  
  const req = https.request(options);
  req.write(payload);
  req.end();
}

module.exports = { logToDatadog };
```

### Option 4: ELK Stack (Self-Hosted)

For complete control:

**Docker Compose Setup**:

```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - 9200:9200
    volumes:
      - elk_data:/usr/share/elasticsearch/data
  
  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    ports:
      - 5044:5044
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - 5601:5601
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

volumes:
  elk_data:
```

## Structured Logging

### Log Format

Use consistent JSON format:

```javascript
// utils/logger.js
function log(level, message, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message: message,
    service: 'joshburt-api',
    environment: process.env.NODE_ENV || 'development',
    ...context
  };
  
  // Console output (captured by Netlify)
  console.log(JSON.stringify(logEntry));
  
  // Send to external service if configured
  if (process.env.LOG_DRAIN_URL) {
    sendToLogDrain(logEntry);
  }
}

function logInfo(message, context) {
  log('info', message, context);
}

function logWarn(message, context) {
  log('warn', message, context);
}

function logError(message, error, context) {
  log('error', message, {
    ...context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  });
}

module.exports = { logInfo, logWarn, logError };
```

### Usage in Functions

```javascript
const { logInfo, logError } = require('../utils/logger');

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  logInfo('Request received', {
    requestId,
    path: event.path,
    method: event.httpMethod,
    userAgent: event.headers['user-agent']
  });
  
  try {
    // Function logic
    const result = await processRequest(event);
    
    logInfo('Request completed', {
      requestId,
      statusCode: 200,
      duration: Date.now() - startTime
    });
    
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    logError('Request failed', error, {
      requestId,
      path: event.path
    });
    
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
```

## Log Queries

### Common Queries

```bash
# Show all errors in last hour
level:ERROR timestamp:[now-1h TO now]

# Show slow requests (>5s)
duration:>5000

# Show failed logins
action:"user_login" AND success:false

# Show database errors
message:"database" AND level:ERROR

# Show requests from specific user
user_id:"12345"
```

### Saved Searches

Create saved searches for:
1. Critical errors (5xx)
2. Authentication failures
3. Slow database queries
4. High memory usage
5. Failed deployments

## Log Retention

### Retention Policy

```yaml
retention_policy:
  debug_logs: 7 days
  info_logs: 30 days
  warning_logs: 90 days
  error_logs: 1 year
  audit_logs: 7 years
```

### Archive Strategy

```bash
# Weekly archive script
#!/bin/bash
# scripts/archive-logs.sh

DATE=$(date -d '90 days ago' +%Y-%m-%d)

# Archive old logs
curl -X POST http://elasticsearch:9200/logs-*/_delete_by_query \
  -H 'Content-Type: application/json' \
  -d "{
    \"query\": {
      \"range\": {
        \"timestamp\": {
          \"lt\": \"$DATE\"
        }
      }
    }
  }"
```

## Monitoring Log Health

### Log Volume Monitoring

```javascript
// scripts/monitor-log-volume.js
const { getDb } = require('../config/database');

async function checkLogVolume() {
  const db = await getDb();
  
  try {
    // Check audit log volume
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_day
      FROM audit_logs
    `);
    
    const { total, last_hour, last_day } = result.rows[0];
    
    console.log('Log Volume:');
    console.log(`  Total: ${total}`);
    console.log(`  Last Hour: ${last_hour}`);
    console.log(`  Last Day: ${last_day}`);
    
    // Alert if unusual volume
    if (last_hour > 10000) {
      console.warn('⚠️  Unusually high log volume!');
    }
  } finally {
    await db.end();
  }
}

checkLogVolume();
```

## Best Practices

1. **Structured Logging**: Always use JSON format
2. **Include Context**: Add request IDs, user IDs, etc.
3. **Log Levels**: Use appropriate levels (DEBUG, INFO, WARN, ERROR)
4. **Sensitive Data**: Never log passwords, tokens, or PII
5. **Performance**: Async logging to avoid blocking
6. **Correlation**: Use request IDs to trace through system
7. **Retention**: Archive old logs, keep recent ones accessible
8. **Monitoring**: Alert on log volume anomalies

## Resources

- [Netlify Log Drains](https://docs.netlify.com/monitor-sites/log-drains/)
- [Papertrail Documentation](https://documentation.solarwinds.com/en/success_center/papertrail/default.htm)
- [ELK Stack Guide](https://www.elastic.co/guide/en/elastic-stack/current/index.html)
- [Structured Logging Best Practices](https://www.datadoghq.com/blog/log-management-best-practices/)
