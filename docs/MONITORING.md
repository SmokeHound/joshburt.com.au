# Uptime Monitoring Configuration

This document provides configuration guidance for setting up uptime monitoring for joshburt.com.au.

## Overview

The application provides health check endpoints that can be monitored by external services like UptimeRobot, Pingdom, or similar uptime monitoring solutions.

## Health Check Endpoint

**URL**: `https://joshburt.com.au/netlify/functions/health`

**Method**: GET

**Expected Response**: 200 OK (healthy) or 503 Service Unavailable (degraded)

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "version": "1.0.0",
  "uptime": {
    "processSeconds": 12345,
    "containerSeconds": 12345
  },
  "database": {
    "status": "connected",
    "driver": "postgresql",
    "latencyMs": 5
  },
  "memory": {
    "heapUsed": 50,
    "heapTotal": 100,
    "external": 5,
    "rss": 150,
    "unit": "MB"
  },
  "checks": {
    "database": true,
    "memory": true,
    "responseTime": true
  },
  "latencyMs": 10
}
```

## Recommended Monitoring Services

### UptimeRobot (Free/Paid)

**Setup Instructions**:
1. Create account at https://uptimerobot.com
2. Add new monitor with type "HTTP(s)"
3. Configure:
   - URL: `https://joshburt.com.au/netlify/functions/health`
   - Monitoring Interval: 5 minutes
   - Monitor Timeout: 30 seconds
   - Monitor Type: HTTP(s)
   - Expected Status Code: 200

**Alert Contacts**:
- Email notifications for downtime
- SMS for critical alerts (paid plan)
- Webhook integration with Slack/Discord

### Pingdom (Paid)

**Setup Instructions**:
1. Create account at https://pingdom.com
2. Add new uptime check
3. Configure:
   - URL: `https://joshburt.com.au/netlify/functions/health`
   - Check Interval: 1-5 minutes
   - Response Time Alerting: >5000ms
   - Custom HTTP header: `X-Monitor: Pingdom`

**Advanced Features**:
- Real User Monitoring (RUM)
- Transaction monitoring for complex user flows
- Page speed monitoring

### Better Uptime (Free/Paid)

**Setup Instructions**:
1. Create account at https://betteruptime.com
2. Add new monitor
3. Configure:
   - URL: `https://joshburt.com.au/netlify/functions/health`
   - Check Frequency: Every minute (free tier: every 3 minutes)
   - Timezone: Your preferred timezone
   - Status Page: Create public status page

**Features**:
- Incident management
- On-call scheduling
- Public status page
- Phone call alerts

### Self-Hosted Options

#### Uptime Kuma (Docker)

**Setup**:
```bash
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
```

**Configuration**:
1. Access web UI at http://localhost:3001
2. Add new monitor
3. Configure health check URL
4. Set notification methods (email, Slack, Discord, etc.)

## Monitoring Strategy

### Critical Checks (Every 1-5 minutes)

1. **Health Endpoint**: `/netlify/functions/health`
   - Alert on: Status != 200, Response time > 5s
   - Action: Immediate investigation

2. **Main Website**: `https://joshburt.com.au/`
   - Alert on: Status != 200, Response time > 3s
   - Action: Check CDN and hosting status

### Standard Checks (Every 5-15 minutes)

3. **Authentication**: `/netlify/functions/auth?action=me`
   - Requires valid JWT token
   - Alert on: 5xx errors
   - Action: Check database and auth service

4. **Database Connectivity**: Monitored via health endpoint
   - Alert on: `database.status != "connected"`
   - Action: Check database service status

### Performance Monitoring

- **Response Time**: Alert if health check > 1000ms
- **Database Latency**: Alert if > 100ms (from health check)
- **Memory Usage**: Alert if heap > 400MB (from health check)

## Alert Configuration

### Alert Levels

1. **Critical** (Immediate Response Required)
   - Website down (status != 200)
   - Health check failing
   - Database disconnected
   - Response time > 10 seconds

2. **Warning** (Response Within Hours)
   - Degraded performance (status = 503)
   - High memory usage (>400MB)
   - Slow response times (1-5 seconds)
   - Database latency > 100ms

3. **Info** (Monitor and Review)
   - Container restarts
   - Intermittent errors (< 5% error rate)
   - Minor performance degradation

### Notification Channels

**Primary**: Email to ops team
**Secondary**: Slack/Discord webhook
**Escalation**: SMS/Phone call for critical alerts (after 5 minutes of downtime)

## Integration with Sentry

The health check includes Sentry status when configured:

```json
{
  "monitoring": {
    "errorTracking": "enabled",
    "environment": "production"
  }
}
```

## Maintenance Windows

Schedule maintenance windows in your monitoring service:
- Weekly: Sunday 2:00-4:00 AM UTC (database backups)
- Monthly: First Sunday 1:00-3:00 AM UTC (system updates)

## Status Page

Create a public status page to communicate uptime to users:

**Options**:
1. Better Uptime status page
2. Statuspage.io
3. Custom status page using health endpoint data

**Recommended URL**: `https://status.joshburt.com.au`

## Testing Alerts

Before going live, test your alerting:

```bash
# Simulate downtime by stopping the service
# Or modify health endpoint to return 503

# Verify alerts are received within expected timeframe
```

## Metrics to Track

1. **Uptime Percentage**: Target 99.9% (43 minutes downtime/month)
2. **Mean Time To Recovery (MTTR)**: Target < 15 minutes
3. **Mean Time Between Failures (MTBF)**: Target > 30 days
4. **Response Time**: P50 < 200ms, P95 < 1000ms, P99 < 3000ms

## Monitoring Checklist

- [ ] Set up primary monitoring service (UptimeRobot/Pingdom)
- [ ] Configure health check monitoring (5-minute intervals)
- [ ] Set up main website monitoring (5-minute intervals)
- [ ] Configure email alerts
- [ ] Configure Slack/Discord webhooks
- [ ] Set up SMS alerts for critical issues
- [ ] Create public status page
- [ ] Configure maintenance windows
- [ ] Test alert delivery
- [ ] Document escalation procedures
- [ ] Review and adjust alert thresholds monthly

## Environment Variables

For monitoring integration, set these environment variables:

```bash
# Sentry Error Tracking
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.0.0

# Custom monitoring headers (optional)
MONITORING_SECRET=random-secret-for-authenticated-checks
```

## Custom Health Checks

You can add custom health checks by extending the health endpoint:

```javascript
// Example: Check external service connectivity
const externalServiceOk = await checkExternalService();
response.checks.externalService = externalServiceOk;
```

## Support

For issues with monitoring setup:
- Review logs: Check Netlify function logs
- Test endpoint: `curl https://joshburt.com.au/netlify/functions/health`
- Check DNS: `nslookup joshburt.com.au`
- Verify SSL: `openssl s_client -connect joshburt.com.au:443`

