# Quick Reference Guide - Phase 6 Features

This guide provides quick access to all Phase 6 features and commands.

## Deployment Commands

### Database Migrations

```bash
# Check for pending migrations (dry-run)
node scripts/run-migrations.js --dry-run

# Apply all pending migrations
node scripts/run-migrations.js
```

### Build & Deploy

```bash
# Full validation (lint + build + test)
npm run validate

# Build CSS
npm run build:css

# Run tests
npm test

# Run all function tests
npm run test:all
```

## Monitoring & Metrics

### Health Check

```bash
# Check application health
curl https://joshburt.com.au/.netlify/functions/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-31T10:00:00.000Z",
#   "database": { "status": "connected", "latencyMs": 5 },
#   "uptime": 12345
# }
```

### Metrics Endpoints

```bash
# Get metrics summary (last hour by default)
curl https://joshburt.com.au/.netlify/functions/metrics?action=summary

# Get metrics for custom time window (in milliseconds)
curl "https://joshburt.com.au/.netlify/functions/metrics?action=summary&timeWindow=3600000"

# Check for active alerts
curl https://joshburt.com.au/.netlify/functions/metrics?action=alerts

# Get endpoint-specific metrics
curl "https://joshburt.com.au/.netlify/functions/metrics?action=endpoint&endpoint=/users"

# Check overall health status
curl https://joshburt.com.au/.netlify/functions/metrics?action=health
```

## Reporting

### Generate Weekly Report

```bash
# Generate performance report manually
node scripts/generate-weekly-report.js

# Reports are saved to:
# - JSON: data/reports/weekly-report-YYYY-MM-DD.json
# - Markdown: data/reports/weekly-report-YYYY-MM-DD.md
```

### View GitHub Action Reports

1. Go to GitHub repository
2. Click "Actions" tab
3. Select "Weekly Performance Report" workflow
4. Click latest run
5. Download "weekly-report-*" artifact

## Log Management

### View Logs

```bash
# View today's logs
cat data/logs/app-$(date +%Y-%m-%d).log

# View recent logs (last 100 lines)
tail -100 data/logs/app-$(date +%Y-%m-%d).log

# Search logs for errors
grep '"level":"ERROR"' data/logs/app-*.log

# Count errors by day
for file in data/logs/app-*.log; do
  echo "$file: $(grep -c '"level":"ERROR"' "$file" || echo 0) errors"
done
```

### Query Logs Programmatically

```javascript
const { getLogAggregator } = require('./utils/log-aggregator');

const logger = getLogAggregator();

// Get recent error logs
const errors = await logger.query({
  level: 'ERROR',
  limit: 100
});

// Get logs by date range
const logs = await logger.query({
  startDate: '2025-10-30',
  endDate: '2025-10-31',
  limit: 500
});

// Search logs
const searchResults = await logger.query({
  search: 'database',
  limit: 50
});

// Get statistics
const stats = await logger.getStatistics(7); // last 7 days
console.log(stats);
```

## Maintenance Commands

### Token Cleanup

```bash
# Prune expired refresh tokens
npm run prune:tokens

# Or directly:
node scripts/prune-refresh-tokens.js
```

### Log Cleanup

```javascript
const { getLogAggregator } = require('./utils/log-aggregator');

const logger = getLogAggregator();

// Delete logs older than 30 days
const deletedCount = await logger.cleanup(30);
console.log(`Deleted ${deletedCount} old log files`);
```

## Rollback Procedures

### Quick Rollback

```bash
# Revert last commit (safest)
git revert HEAD
git push origin main

# Or deploy from specific commit
git checkout <good-commit-sha>
# Then trigger manual deployment
```

### Netlify Rollback

1. Go to Netlify dashboard
2. Navigate to Deploys
3. Find last successful deployment
4. Click "Publish deploy"

See [ROLLBACK_PROCEDURES.md](ROLLBACK_PROCEDURES.md) for detailed instructions.

## GitHub Actions Workflows

### Main Deployment Workflow

**Trigger**: Push to main branch  
**File**: `.github/workflows/main.yml`

**Steps**:
1. Checkout code
2. Install dependencies
3. Run migrations (dry-run)
4. Lint code
5. Build CSS
6. Run tests
7. Deploy to FTP
8. Run migrations (production)
9. Send notifications

### Nightly Maintenance

**Trigger**: Daily at 2 AM UTC (or manual)  
**File**: `.github/workflows/nightly-maintenance.yml`

**Steps**:
1. Security audit
2. Token cleanup
3. Dependency check
4. Linting
5. Generate report

**To trigger manually**:
```bash
# Via GitHub UI: Actions > Nightly Maintenance > Run workflow
# Or use GitHub CLI:
gh workflow run nightly-maintenance.yml
```

### Weekly Reports

**Trigger**: Monday at 9 AM UTC (or manual)  
**File**: `.github/workflows/weekly-report.yml`

**Steps**:
1. Generate performance report
2. Upload as artifact
3. Create summary

**To trigger manually**:
```bash
gh workflow run weekly-report.yml
```

## Alert Thresholds

Current alert thresholds (configurable in `utils/metrics-collector.js`):

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Error Rate | > 5% | Critical |
| Response Time | > 3000ms | Warning |
| Request Rate | > 1000/min | Warning |
| Critical Errors | > 0 | Critical |

## Metrics Collection API

### Record Metrics

```javascript
const { getMetricsCollector } = require('./utils/metrics-collector');

const collector = getMetricsCollector();

// Record a request
collector.recordRequest({
  endpoint: '/users',
  method: 'GET',
  statusCode: 200,
  responseTime: 150,
  userAgent: 'Mozilla/5.0...',
  ip: '192.168.1.1'
});

// Record an error
collector.recordError({
  type: 'DatabaseError',
  message: 'Connection timeout',
  stack: error.stack,
  endpoint: '/users',
  userId: 123,
  severity: 'high'
});

// Record performance
collector.recordPerformance({
  operation: 'database_query',
  duration: 50,
  metadata: { query: 'SELECT * FROM users' }
});

// Get summary
const summary = collector.getSummary(3600000); // last hour
console.log(summary);

// Check alerts
const alerts = collector.checkAlerts();
if (alerts.length > 0) {
  console.error('Active alerts:', alerts);
}
```

## Logging API

### Write Logs

```javascript
const { getLogAggregator } = require('./utils/log-aggregator');

const logger = getLogAggregator();

// Log at different levels
logger.debug('Debug information', { userId: 123 });
logger.info('User logged in', { userId: 123 });
logger.warn('Rate limit approaching', { endpoint: '/api' });
logger.error('Database error', { error: err.message });
logger.critical('System failure', { error: err.message });

// Logs are automatically buffered and flushed
// Manual flush if needed:
await logger.flush();

// Shutdown (flushes remaining logs)
await logger.shutdown();
```

## Documentation Quick Links

- [Architecture](ARCHITECTURE.md) - System architecture and diagrams
- [Deployment](DEPLOYMENT.md) - Complete deployment guide
- [Rollback](ROLLBACK_PROCEDURES.md) - Rollback procedures
- [Documentation Index](DOCS_INDEX.md) - All documentation
- [Phase 6 Summary](PHASE6_IMPLEMENTATION_SUMMARY.md) - Implementation details
- [API Documentation](API_DOCUMENTATION.md) - API reference
- [Database](DATABASE.md) - Database schema and operations

**Note:** The application uses a predefined set of avatars that users select from; arbitrary avatar uploads are not accepted. See [Deployment](DEPLOYMENT.md#avatar-selection-predetermined-avatars) for details and operational notes.

## Environment Variables

### Required for Monitoring

```bash
# Database (PostgreSQL required)
DB_TYPE=postgres
DB_HOST=your-host
DB_PORT=5432
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=your-database

# JWT (for authentication)
JWT_SECRET=your-secret
```

### Optional for Monitoring

```bash
# Sentry (if using external error tracking)
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production

# Custom monitoring
MONITORING_SECRET=random-secret
```

## Troubleshooting

### Metrics Not Collecting

```bash
# Check if metrics file exists
ls -lh data/metrics.json

# Check file permissions
chmod 644 data/metrics.json

# Verify metrics endpoint
curl https://joshburt.com.au/.netlify/functions/metrics?action=summary
```

### Logs Not Appearing

```bash
# Check log directory
ls -lh data/logs/

# Check permissions
chmod 755 data/logs

# Manually test logger
node -e "
const { getLogAggregator } = require('./utils/log-aggregator');
const logger = getLogAggregator();
logger.info('Test log entry');
logger.flush().then(() => console.log('Done'));
"
```

### Migrations Failing

```bash
# Check migration syntax
node scripts/run-migrations.js --dry-run

# Check database connectivity
node scripts/health-check.js

# Review migration logs
# Check GitHub Actions logs for detailed error messages
```

## Performance Tips

### Optimize Metrics Collection

```javascript
// Reduce metric retention if needed
collector.trimMetrics('requests', 500); // Keep last 500 instead of 1000

// Increase buffer size to reduce disk writes
// Edit utils/metrics-collector.js:
// this.maxBufferSize = 200; // Default is 100
```

### Optimize Logging

```javascript
// Adjust buffer size and flush interval
// Edit utils/log-aggregator.js:
// this.maxBufferSize = 200; // Default is 100
// setInterval(() => this.flush(), 30000); // 30s instead of 10s
```

## Support

For issues or questions:
1. Check [DOCS_INDEX.md](DOCS_INDEX.md) for relevant documentation
2. Review [PHASE6_IMPLEMENTATION_SUMMARY.md](PHASE6_IMPLEMENTATION_SUMMARY.md)
3. Check GitHub Issues for similar problems
4. Review workflow logs in GitHub Actions

---

**Last Updated**: 2025-10-31  
**Version**: 1.0.0
