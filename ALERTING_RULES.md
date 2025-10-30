# Alerting Rules and Configuration

## Overview

This document defines alerting rules, thresholds, and notification channels for monitoring joshburt.com.au infrastructure and applications.

## Alert Severity Levels

### P0 - Critical (Immediate Response)
- **Response Time**: < 5 minutes
- **Examples**: Site down, database failure, authentication broken
- **Notification**: Phone call, SMS, Slack @channel
- **On-Call**: Yes

### P1 - High (Urgent)
- **Response Time**: < 15 minutes
- **Examples**: High error rate, slow performance, API degradation
- **Notification**: Slack notification, Email
- **On-Call**: Yes

### P2 - Medium (Important)
- **Response Time**: < 1 hour
- **Examples**: Elevated errors, minor performance issues
- **Notification**: Slack, Email
- **On-Call**: During business hours

### P3 - Low (Monitoring)
- **Response Time**: Next business day
- **Examples**: Warnings, deprecation notices, low disk space
- **Notification**: Email summary
- **On-Call**: No

## Alert Rules

### Application Availability

#### Site Down
```yaml
alert: SiteDown
severity: P0
condition: Health check fails
threshold: 3 consecutive failures
duration: 2 minutes
notification:
  - phone: +61-xxx-xxx-xxx
  - slack: @channel
  - email: ops@joshburt.com.au
action: |
  1. Check Netlify status
  2. Verify DNS resolution
  3. Check function logs
  4. Initiate rollback if recent deploy
```

#### Function Timeout
```yaml
alert: FunctionTimeout
severity: P1
condition: Function execution time > 10s
threshold: > 5 occurrences in 5 minutes
notification:
  - slack: #alerts
  - email: ops@joshburt.com.au
action: |
  1. Check function logs
  2. Identify slow queries
  3. Review recent code changes
  4. Consider rollback
```

#### Health Check Degraded
```yaml
alert: HealthCheckDegraded
severity: P1
condition: Health endpoint returns 503
threshold: > 2 minutes
notification:
  - slack: #alerts
  - email: ops@joshburt.com.au
action: |
  1. Check database connectivity
  2. Review function logs
  3. Monitor resource usage
```

### Performance Alerts

#### High Response Time (P95)
```yaml
alert: HighResponseTime
severity: P2
condition: P95 response time > 3 seconds
threshold: 10 minutes sustained
notification:
  - slack: #monitoring
  - email: dev@joshburt.com.au
action: |
  1. Check slow query log
  2. Review recent deployments
  3. Analyze traffic patterns
  4. Consider caching improvements
```

#### High Response Time (P99)
```yaml
alert: VeryHighResponseTime
severity: P1
condition: P99 response time > 10 seconds
threshold: 5 minutes sustained
notification:
  - slack: #alerts
  - email: ops@joshburt.com.au
action: |
  1. Identify slow endpoints
  2. Check database performance
  3. Review recent changes
  4. Consider immediate rollback
```

### Error Rate Alerts

#### High Error Rate (5xx)
```yaml
alert: HighErrorRate
severity: P1
condition: 5xx error rate > 5%
threshold: 5 minutes
notification:
  - slack: #alerts
  - email: ops@joshburt.com.au
action: |
  1. Check Sentry for error details
  2. Review function logs
  3. Identify error patterns
  4. Consider rollback
```

#### Elevated Error Rate
```yaml
alert: ElevatedErrorRate
severity: P2
condition: 5xx error rate > 1%
threshold: 15 minutes
notification:
  - slack: #monitoring
  - email: dev@joshburt.com.au
action: |
  1. Monitor error trends
  2. Check for pattern in errors
  3. Review recent changes
```

#### Client Errors (4xx)
```yaml
alert: HighClientErrorRate
severity: P3
condition: 4xx error rate > 10%
threshold: 30 minutes
notification:
  - slack: #monitoring
action: |
  1. Check error types
  2. Review API changes
  3. Check for bot traffic
  4. Update documentation if needed
```

### Database Alerts

#### Database Connection Failed
```yaml
alert: DatabaseConnectionFailed
severity: P0
condition: Cannot connect to database
threshold: Immediate
notification:
  - phone: +61-xxx-xxx-xxx
  - slack: @channel
  - email: ops@joshburt.com.au
action: |
  1. Check database status (Neon/provider)
  2. Verify connection credentials
  3. Check network connectivity
  4. Activate fallback (SQLite if configured)
  5. Contact database provider support
```

#### High Database Latency
```yaml
alert: HighDatabaseLatency
severity: P2
condition: Database query time > 1000ms
threshold: Average over 10 minutes
notification:
  - slack: #monitoring
  - email: dev@joshburt.com.au
action: |
  1. Identify slow queries
  2. Check database CPU/memory
  3. Review query plans
  4. Consider adding indexes
```

#### Database Connection Pool Exhausted
```yaml
alert: ConnectionPoolExhausted
severity: P1
condition: Available connections < 10%
threshold: 5 minutes
notification:
  - slack: #alerts
  - email: ops@joshburt.com.au
action: |
  1. Check for connection leaks
  2. Review connection pool settings
  3. Identify long-running queries
  4. Increase pool size if needed
```

### Security Alerts

#### Multiple Failed Login Attempts
```yaml
alert: BruteForceAttempt
severity: P1
condition: > 10 failed logins from same IP
threshold: 5 minutes
notification:
  - slack: #security
  - email: security@joshburt.com.au
action: |
  1. Review audit logs
  2. Check IP address
  3. Consider IP blocking
  4. Alert affected users if accounts targeted
```

#### Unusual Admin Activity
```yaml
alert: UnusualAdminActivity
severity: P2
condition: Admin actions outside business hours
threshold: Immediate
notification:
  - slack: #security
  - email: security@joshburt.com.au
action: |
  1. Verify with admin user
  2. Review audit trail
  3. Check for unauthorized access
```

#### SSL Certificate Expiring
```yaml
alert: SSLCertificateExpiring
severity: P2
condition: Certificate expires in < 30 days
threshold: Immediate
notification:
  - slack: #ops
  - email: ops@joshburt.com.au
action: |
  1. Renew SSL certificate
  2. Update certificate in Netlify
  3. Verify renewal successful
```

### Business Metrics Alerts

#### No Orders in 24 Hours
```yaml
alert: NoOrders24Hours
severity: P2
condition: Order count = 0 for 24 hours
threshold: 24 hours
notification:
  - slack: #business
  - email: business@joshburt.com.au
action: |
  1. Check if intentional (maintenance)
  2. Verify ordering system working
  3. Check payment processing
  4. Review traffic analytics
```

#### Revenue Drop
```yaml
alert: RevenueDrop
severity: P2
condition: Today's revenue < 50% of 7-day average
threshold: After 6 PM
notification:
  - slack: #business
  - email: business@joshburt.com.au
action: |
  1. Review sales data
  2. Check for pricing errors
  3. Verify payment processing
  4. Review traffic sources
```

### Infrastructure Alerts

#### High Memory Usage
```yaml
alert: HighMemoryUsage
severity: P2
condition: Function memory > 400MB
threshold: 10 minutes sustained
notification:
  - slack: #ops
  - email: ops@joshburt.com.au
action: |
  1. Identify memory-intensive functions
  2. Check for memory leaks
  3. Review recent code changes
  4. Consider optimization
```

#### Cold Start Increase
```yaml
alert: HighColdStartRate
severity: P3
condition: Cold start rate > 20%
threshold: 1 hour
notification:
  - slack: #monitoring
action: |
  1. Review function bundle sizes
  2. Check traffic patterns
  3. Consider keep-warm strategy
  4. Optimize dependencies
```

## Notification Channels

### Slack Integration

```javascript
// scripts/send-slack-alert.js
const https = require('https');

function sendSlackAlert(level, alert, details) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  
  const colors = {
    P0: '#FF0000',  // Red
    P1: '#FF9900',  // Orange
    P2: '#FFFF00',  // Yellow
    P3: '#0099FF'   // Blue
  };
  
  const payload = JSON.stringify({
    text: `🚨 ${level} Alert: ${alert}`,
    attachments: [{
      color: colors[level],
      fields: [
        { title: 'Severity', value: level, short: true },
        { title: 'Time', value: new Date().toISOString(), short: true },
        { title: 'Details', value: details, short: false }
      ]
    }]
  });
  
  const options = {
    hostname: 'hooks.slack.com',
    path: webhook.replace('https://hooks.slack.com', ''),
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

module.exports = { sendSlackAlert };
```

### Email Alerts

```javascript
// scripts/send-email-alert.js
const nodemailer = require('nodemailer');

async function sendEmailAlert(level, alert, details) {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  const html = `
    <h2 style="color: ${level === 'P0' ? 'red' : 'orange'}">
      ${level} Alert: ${alert}
    </h2>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    <p><strong>Severity:</strong> ${level}</p>
    <hr>
    <h3>Details:</h3>
    <pre>${details}</pre>
    <hr>
    <p>
      <a href="https://joshburt.netlify.app/.netlify/functions/health">
        Check System Health
      </a>
    </p>
  `;
  
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: getAlertEmail(level),
    subject: `[${level}] ${alert}`,
    html: html
  });
}

function getAlertEmail(level) {
  const emails = {
    P0: 'ops@joshburt.com.au',
    P1: 'ops@joshburt.com.au',
    P2: 'dev@joshburt.com.au',
    P3: 'dev@joshburt.com.au'
  };
  return emails[level] || 'dev@joshburt.com.au';
}

module.exports = { sendEmailAlert };
```

### SMS/Phone Alerts (Twilio)

```javascript
// scripts/send-sms-alert.js
const twilio = require('twilio');

async function sendSMSAlert(level, alert, details) {
  if (level !== 'P0' && level !== 'P1') {
    return; // Only send SMS for critical alerts
  }
  
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  
  await client.messages.create({
    body: `${level} Alert: ${alert}\n\nTime: ${new Date().toISOString()}\n\nCheck: https://joshburt.com.au/admin`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: process.env.ON_CALL_PHONE_NUMBER
  });
}

module.exports = { sendSMSAlert };
```

## Alert Testing

### Test Script

Create `scripts/test-alerts.js`:

```javascript
#!/usr/bin/env node

const { sendSlackAlert } = require('./send-slack-alert');
const { sendEmailAlert } = require('./send-email-alert');

async function testAlerts() {
  console.log('Testing alert system...\n');
  
  // Test Slack
  console.log('📢 Sending Slack test alert...');
  await sendSlackAlert('P3', 'Test Alert', 'This is a test alert from the monitoring system');
  console.log('✅ Slack alert sent\n');
  
  // Test Email
  console.log('📧 Sending Email test alert...');
  await sendEmailAlert('P3', 'Test Alert', 'This is a test alert from the monitoring system');
  console.log('✅ Email alert sent\n');
  
  console.log('Alert test complete!');
}

testAlerts().catch(console.error);
```

Run tests:

```bash
node scripts/test-alerts.js
```

## Alert Management

### Silencing Alerts

During maintenance windows:

```bash
# Silence alerts for 2 hours
curl -X POST https://your-alerting-system/api/silence \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "job", "value": "joshburt"}],
    "startsAt": "2025-01-01T10:00:00Z",
    "endsAt": "2025-01-01T12:00:00Z",
    "comment": "Scheduled maintenance"
  }'
```

### Alert Escalation

```yaml
escalation_policy:
  level_1:
    wait: 5 minutes
    notify:
      - slack: #alerts
      - email: ops@joshburt.com.au
  
  level_2:
    wait: 10 minutes
    notify:
      - sms: +61-xxx-xxx-xxx
      - slack: @on-call-engineer
  
  level_3:
    wait: 20 minutes
    notify:
      - phone: +61-xxx-xxx-xxx
      - slack: @team-lead
```

## Alert Response Playbooks

### Site Down Playbook

1. **Verify**: Check from multiple locations
2. **Investigate**: Review Netlify deploy status
3. **Check Dependencies**: Database, external APIs
4. **Review Recent Changes**: Last deploy, config changes
5. **Rollback**: If issue started after recent deploy
6. **Monitor**: Watch for recovery
7. **Post-Mortem**: Document incident

### High Error Rate Playbook

1. **Check Sentry**: Review error types and frequency
2. **Review Logs**: Function logs for patterns
3. **Identify Endpoint**: Which function is failing
4. **Recent Changes**: Check recent deploys
5. **Database Health**: Verify database connectivity
6. **Rollback**: If errors started after deploy
7. **Monitor**: Track error rate reduction

## Monitoring Best Practices

1. **Set Realistic Thresholds**: Based on historical data
2. **Avoid Alert Fatigue**: Too many alerts = ignored alerts
3. **Document Responses**: Clear playbooks for each alert
4. **Regular Reviews**: Adjust thresholds quarterly
5. **Test Alerts**: Monthly alert system tests
6. **On-Call Rotation**: Share on-call responsibilities
7. **Post-Incident Reviews**: Learn from incidents

## Resources

- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
- [PagerDuty Incident Response](https://response.pagerduty.com/)
- [Google SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)
