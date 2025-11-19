# Quick Implementation Guide

**Companion to**: UPGRADE_PLAN.md  
**Last Updated**: 2025-11-19

---

## 🚀 Getting Started

This guide provides quick-start instructions for implementing features from the UPGRADE_PLAN.md.

---

## Phase 1: Error Tracking (Week 1)

### Step 1: Database Setup

```bash
# Create migration file
cat > migrations/005_add_error_tracking.sql << 'EOF'
CREATE TABLE error_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id INTEGER REFERENCES users(id),
  url TEXT,
  user_agent TEXT,
  ip_address INET,
  environment VARCHAR(50),
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  occurrences INTEGER DEFAULT 1,
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  fingerprint VARCHAR(64) UNIQUE
);

CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX idx_error_logs_fingerprint ON error_logs(fingerprint);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
EOF

# Apply migration
node scripts/run-migrations.js
```

### Step 2: Create Error Tracker Utility

```bash
# Create utils/error-tracker.js
cat > utils/error-tracker.js << 'EOF'
const crypto = require('crypto');
const { query } = require('../config/database');

/**
 * Generate fingerprint for error grouping
 */
function generateFingerprint(error, url) {
  const signature = `${error.name}:${error.message}:${url}`;
  return crypto.createHash('sha256').update(signature).digest('hex').substring(0, 64);
}

/**
 * Log error to database
 */
async function logError({ level, message, stack, userId, url, userAgent, ipAddress, environment, metadata }) {
  const fingerprint = generateFingerprint({ name: 'Error', message }, url || 'unknown');
  
  try {
    // Check if error already exists
    const existing = await query(
      'SELECT id, occurrences FROM error_logs WHERE fingerprint = $1',
      [fingerprint]
    );
    
    if (existing.rows.length > 0) {
      // Update existing error
      await query(
        `UPDATE error_logs 
         SET occurrences = occurrences + 1, last_seen = NOW() 
         WHERE fingerprint = $1`,
        [fingerprint]
      );
    } else {
      // Insert new error
      await query(
        `INSERT INTO error_logs 
         (level, message, stack_trace, user_id, url, user_agent, ip_address, environment, metadata, fingerprint)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [level, message, stack, userId, url, userAgent, ipAddress, environment, JSON.stringify(metadata), fingerprint]
      );
    }
  } catch (err) {
    console.error('Failed to log error to database:', err);
  }
}

module.exports = { logError, generateFingerprint };
EOF
```

### Step 3: Create Error Logs API

```bash
# Create netlify/functions/error-logs.js
cat > netlify/functions/error-logs.js << 'EOF'
const { withHandler, error } = require('../../utils/fn');
const { requirePermission } = require('../../utils/http');
const { query } = require('../../config/database');
const { logError } = require('../../utils/error-tracker');

exports.handler = withHandler(async (event) => {
  const method = event.httpMethod;
  
  if (method === 'POST') {
    // Log error from client
    const { level, message, stack, url, userAgent, metadata } = JSON.parse(event.body);
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['client-ip'];
    
    await logError({
      level: level || 'error',
      message,
      stack,
      url,
      userAgent,
      ipAddress,
      environment: process.env.NODE_ENV || 'production',
      metadata
    });
    
    return { statusCode: 201, body: JSON.stringify({ success: true }) };
  }
  
  if (method === 'GET') {
    // Get errors (admin only)
    await requirePermission(event, 'error-logs', 'read');
    
    const { resolved, limit = 50, offset = 0 } = event.queryStringParameters || {};
    
    let sql = 'SELECT * FROM error_logs';
    const params = [];
    
    if (resolved !== undefined) {
      sql += ' WHERE resolved = $1';
      params.push(resolved === 'true');
    }
    
    sql += ' ORDER BY last_seen DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await query(sql, params);
    return { statusCode: 200, body: JSON.stringify(result.rows) };
  }
  
  if (method === 'PUT') {
    // Resolve error (admin only)
    await requirePermission(event, 'error-logs', 'update');
    
    const { id, resolved } = JSON.parse(event.body);
    const user = event.requestContext.user;
    
    await query(
      'UPDATE error_logs SET resolved = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3',
      [resolved, user.id, id]
    );
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }
  
  return error(405, 'Method not allowed');
});
EOF
```

### Step 4: Create Admin Dashboard

```bash
# Create error-monitoring.html
touch error-monitoring.html
# Add HTML UI for viewing/managing errors (see full implementation in UPGRADE_PLAN.md)
```

### Step 5: Test

```bash
# Test the error logging
npm run dev:functions

# In another terminal
curl -X POST http://localhost:8888/.netlify/functions/error-logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "message": "Test error",
    "stack": "Error: Test\n  at test.js:1:1",
    "url": "/test-page"
  }'
```

---

## Phase 2: Email Queue (Week 2)

### Quick Start

```bash
# 1. Create migration
cat > migrations/006_add_email_queue.sql << 'EOF'
CREATE TABLE email_queue (
  id SERIAL PRIMARY KEY,
  to_address VARCHAR(255) NOT NULL,
  from_address VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT,
  body_text TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_priority ON email_queue(priority);

CREATE TABLE email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
EOF

# 2. Apply migration
node scripts/run-migrations.js

# 3. Create email queue function (see UPGRADE_PLAN.md for full code)
touch netlify/functions/email-queue.js

# 4. Create worker script
touch scripts/email-worker.js

# 5. Test
npm run dev:functions
```

---

## Phase 3: Full-Text Search (Week 7)

### Quick Start

```bash
# 1. Create migration
cat > migrations/007_add_fulltext_search.sql << 'EOF'
-- Add search vectors
ALTER TABLE products ADD COLUMN search_vector tsvector;
ALTER TABLE consumables ADD COLUMN search_vector tsvector;
ALTER TABLE filters ADD COLUMN search_vector tsvector;

-- Create update function
CREATE OR REPLACE FUNCTION update_product_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.code, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER product_search_vector_update 
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Create indexes
CREATE INDEX idx_products_search_vector ON products USING GIN(search_vector);

-- Search history
CREATE TABLE search_queries (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  results_count INTEGER,
  clicked_result_id INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_queries_query ON search_queries(query);
EOF

# 2. Apply migration
node scripts/run-migrations.js

# 3. Create search function
touch netlify/functions/search.js

# 4. Test search
curl "http://localhost:8888/.netlify/functions/search?q=oil+filter"
```

---

## Testing Each Phase

### Unit Tests

```javascript
// tests/unit/error-tracker.test.js
describe('Error Tracker', () => {
  it('should generate consistent fingerprints', () => {
    const error1 = { name: 'Error', message: 'Test' };
    const error2 = { name: 'Error', message: 'Test' };
    const fp1 = generateFingerprint(error1, '/page');
    const fp2 = generateFingerprint(error2, '/page');
    expect(fp1).toBe(fp2);
  });
});
```

### Integration Tests

```javascript
// tests/integration/error-logs.test.js
describe('Error Logs API', () => {
  it('should log errors', async () => {
    const response = await fetch('/.netlify/functions/error-logs', {
      method: 'POST',
      body: JSON.stringify({ message: 'Test error' })
    });
    expect(response.status).toBe(201);
  });
});
```

---

## Deployment Checklist

Before deploying each phase:

- [ ] All tests pass (`npm run test:all`)
- [ ] Linting passes (`npm run lint`)
- [ ] Migrations tested on staging database
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Backup created
- [ ] Monitoring configured
- [ ] Rollback plan ready

---

## Common Issues & Solutions

### Database Connection Pool Exhausted

**Problem**: Too many concurrent connections  
**Solution**: Increase `DB_POOL_MAX` or implement connection queuing

```javascript
// config/database.js
const pool = new Pool({
  max: process.env.DB_POOL_MAX || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000
});
```

### Email Queue Stuck

**Problem**: Emails not sending  
**Solution**: Check SMTP settings and restart worker

```bash
# Check queue status
psql -c "SELECT status, COUNT(*) FROM email_queue GROUP BY status;"

# Reset stuck emails
psql -c "UPDATE email_queue SET status='pending', attempts=0 WHERE status='sending';"
```

### Search Performance Slow

**Problem**: Full-text search is slow  
**Solution**: Ensure GIN indexes are created

```bash
# Verify indexes
psql -c "SELECT tablename, indexname FROM pg_indexes WHERE tablename='products';"

# Reindex if needed
psql -c "REINDEX INDEX idx_products_search_vector;"
```

---

## Performance Optimization Tips

### Database

1. **Use EXPLAIN ANALYZE** for slow queries
   ```sql
   EXPLAIN ANALYZE SELECT * FROM products WHERE search_vector @@ to_tsquery('oil');
   ```

2. **Create partial indexes** for common filters
   ```sql
   CREATE INDEX idx_products_active ON products(id) WHERE is_active = true;
   ```

3. **Use materialized views** for complex aggregations
   ```sql
   CREATE MATERIALIZED VIEW product_stats AS
   SELECT category, COUNT(*), AVG(price) FROM products GROUP BY category;
   ```

### Caching

1. **Cache expensive queries** in memory
2. **Use ETags** for HTTP caching
3. **Implement stale-while-revalidate** strategy

### Frontend

1. **Lazy load components** not immediately needed
2. **Debounce search inputs** (300ms delay)
3. **Paginate large lists** (50 items max)

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Error Rate**: Should be < 0.1%
2. **Response Time**: p95 < 200ms
3. **Database Connections**: < 80% of pool
4. **Email Queue**: Pending < 100
5. **Cache Hit Rate**: > 70%

### Set Up Alerts

```javascript
// Example: Alert on high error rate
if (errorRate > 0.1) {
  await sendAlert({
    severity: 'high',
    message: `Error rate elevated: ${errorRate}%`,
    to: 'admin@joshburt.com.au'
  });
}
```

---

## Next Steps

1. ✅ Review UPGRADE_PLAN.md for complete feature specifications
2. ✅ Set up local development environment
3. ✅ Choose first phase to implement
4. ✅ Create feature branch: `git checkout -b feature/error-tracking`
5. ✅ Follow implementation steps above
6. ✅ Write tests
7. ✅ Deploy to staging
8. ✅ Get user feedback
9. ✅ Deploy to production
10. ✅ Move to next phase

---

## Support

- **Documentation**: See UPGRADE_PLAN.md for detailed specifications
- **Issues**: https://github.com/SmokeHound/joshburt.com.au/issues
- **Discussions**: https://github.com/SmokeHound/joshburt.com.au/discussions

---

**Last Updated**: 2025-11-19  
**Maintained By**: Development Team
