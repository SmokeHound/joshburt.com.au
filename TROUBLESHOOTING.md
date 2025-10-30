# Troubleshooting Guide

Common issues and solutions for joshburt.com.au development and deployment.

## Table of Contents

- [Development Issues](#development-issues)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)
- [Testing Issues](#testing-issues)

## Development Issues

### npm install fails

**Symptoms**: Package installation errors, missing dependencies

**Solutions**:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still fails, check Node.js version
node --version  # Should be v22+

# Update npm
npm install -g npm@latest
```

### Local server won't start

**Symptoms**: Port already in use, connection refused

**Solutions**:

```bash
# Check if port 8000 is in use
lsof -i :8000
# Or on Windows: netstat -ano | findstr :8000

# Kill process using port
kill -9 <PID>

# Try different port
python3 -m http.server 8001

# For Netlify dev
netlify dev --port 8889
```

### Cannot load static assets

**Symptoms**: CSS not loading, 404 errors for assets

**Solutions**:

1. Check file paths are correct:
```html
<!-- Correct -->
<link rel="stylesheet" href="/assets/css/styles.css">

<!-- Wrong -->
<link rel="stylesheet" href="assets/css/styles.css">
```

2. Verify files exist:
```bash
ls -la assets/css/
```

3. Check TailwindCSS build:
```bash
npm run build:css
```

### ESLint errors

**Symptoms**: Linting fails in CI, red squiggles in editor

**Solutions**:

```bash
# Auto-fix issues
npm run lint:js -- --fix

# Check specific file
npx eslint path/to/file.js

# Disable rule for specific line (use sparingly)
// eslint-disable-next-line no-unused-vars
const unused = 'variable';
```

## Database Issues

### Cannot connect to database

**Symptoms**: "Connection refused", "Authentication failed"

**Solutions**:

1. Check environment variables:
```bash
# Verify .env file
cat .env | grep DB_

# Required variables
echo $DB_TYPE
echo $NEON_DATABASE_URL
```

2. Test connection:
```bash
# For PostgreSQL
psql "$NEON_DATABASE_URL"

# For SQLite
ls -la database.sqlite
```

3. Check firewall/network:
```bash
# Test connectivity to Neon
ping <neon-host>

# Check SSL requirements
# Neon requires sslmode=require
```

4. Verify credentials:
- Check Neon console for correct connection string
- Ensure no spaces or special characters in password
- Try regenerating database password

### Migration fails

**Symptoms**: Migration script errors, transaction rollback

**Solutions**:

1. Check migration status:
```bash
node scripts/run-migrations.js --status
```

2. Review migration SQL:
```bash
cat migrations/XXX_migration.sql
```

3. Test migration manually:
```bash
psql "$NEON_DATABASE_URL"
\i migrations/XXX_migration.sql
```

4. Common issues:
```sql
-- Missing IF NOT EXISTS
CREATE TABLE my_table ...  -- ❌
CREATE TABLE IF NOT EXISTS my_table ...  -- ✅

-- Column already exists
ALTER TABLE users ADD COLUMN email ...  -- ❌
ALTER TABLE users ADD COLUMN IF NOT EXISTS email ...  -- ✅

-- Dependency issues - run migrations in order
-- Check version numbers are sequential
```

### Slow database queries

**Symptoms**: Requests timeout, high response times

**Solutions**:

1. Identify slow queries:
```sql
-- Enable query logging in Neon dashboard
-- Or check audit_logs for slow operations

-- Check query execution time
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

2. Add missing indexes:
```sql
-- Check if index exists
SELECT * FROM pg_indexes WHERE tablename = 'users';

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

3. Optimize queries:
```sql
-- Before: N+1 query problem
SELECT * FROM orders;
-- Then for each order:
SELECT * FROM users WHERE id = order.user_id;

-- After: Use JOIN
SELECT o.*, u.name as user_name
FROM orders o
JOIN users u ON o.created_by = u.id;
```

### Database connection pool exhausted

**Symptoms**: "Too many connections", timeouts

**Solutions**:

1. Check for connection leaks:
```javascript
// Bad - connection not closed
const db = await getDb();
const result = await db.query('SELECT ...');
return result;  // ❌ Connection not released!

// Good - always close connections
const db = await getDb();
try {
  const result = await db.query('SELECT ...');
  return result;
} finally {
  await db.end();  // ✅ Connection released
}
```

2. Increase pool size (if needed):
```javascript
// config/database.js
const pool = new Pool({
  max: 20,  // Increase from default 10
  idleTimeoutMillis: 30000
});
```

## Authentication Issues

### JWT token invalid

**Symptoms**: 401 Unauthorized, "Invalid token"

**Solutions**:

1. Check token format:
```javascript
// Must be: "Bearer <token>"
const auth = event.headers.authorization;
console.log('Auth header:', auth);

// Extract token
const token = auth?.replace('Bearer ', '');
```

2. Verify JWT_SECRET matches:
```bash
# Check .env file
cat .env | grep JWT_SECRET

# In Netlify, check environment variables
netlify env:list
```

3. Check token expiration:
```javascript
const jwt = require('jsonwebtoken');
const decoded = jwt.decode(token);
console.log('Token expires:', new Date(decoded.exp * 1000));
```

4. Regenerate token:
```bash
# Login again to get fresh token
curl -X POST http://localhost:8888/.netlify/functions/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Password verification fails

**Symptoms**: Login always fails with correct password

**Solutions**:

1. Check bcrypt rounds:
```javascript
// Ensure BCRYPT_ROUNDS is set
console.log('Rounds:', process.env.BCRYPT_ROUNDS);

// Default should be 10-12
```

2. Verify password storage:
```sql
-- Check if password is hashed
SELECT password FROM users WHERE email = 'test@example.com';
-- Should see: $2b$10$...

-- If plain text, hash is missing!
```

3. Test bcrypt directly:
```javascript
const bcrypt = require('bcryptjs');

const password = 'password123';
const hash = await bcrypt.hash(password, 10);
console.log('Hash:', hash);

const isValid = await bcrypt.compare(password, hash);
console.log('Valid:', isValid);  // Should be true
```

### OAuth fails (Auth0)

**Symptoms**: Redirect fails, token exchange errors

**Solutions**:

1. Check Auth0 configuration:
```bash
# Verify environment variables
echo $AUTH0_DOMAIN
echo $AUTH0_CLIENT_ID
echo $AUTH0_AUDIENCE
```

2. Verify redirect URIs in Auth0 dashboard:
- Allowed Callback URLs must match exactly
- Include all environments (localhost, staging, production)

3. Test Auth0 endpoint:
```bash
curl https://<your-tenant>.us.auth0.com/.well-known/openid-configuration
```

## Deployment Issues

### Netlify build fails

**Symptoms**: Build error in Netlify logs

**Solutions**:

1. Check build logs:
```bash
netlify logs

# Or in Netlify UI: Deploys → Failed deploy → Deploy log
```

2. Common issues:

```bash
# Missing dependencies
npm ci  # Use ci instead of install

# Node version mismatch
# Check netlify.toml has correct Node version
[build.environment]
  NODE_VERSION = "22"

# Build command fails
# Test locally first
npm run build
```

3. Environment variables missing:
```bash
# List configured variables
netlify env:list

# Add missing variables
netlify env:set JWT_SECRET "your-secret"
```

### Functions timeout

**Symptoms**: 504 Gateway Timeout, function exceeds time limit

**Solutions**:

1. Increase function timeout:
```toml
# netlify.toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
  
[[functions]]
  functions = "*.js"
  [functions.config]
    timeout = 30  # Increase from default 10 seconds
```

2. Optimize slow code:
```javascript
// Identify bottleneck
console.time('database-query');
const result = await db.query('...');
console.timeEnd('database-query');

// Add indexes, reduce data fetched, use caching
```

3. Use async operations:
```javascript
// Bad - sequential
for (const item of items) {
  await processItem(item);  // Slow!
}

// Good - parallel
await Promise.all(items.map(item => processItem(item)));
```

### Deploy succeeds but site broken

**Symptoms**: Successful deploy but errors on site

**Solutions**:

1. Check function logs:
```bash
netlify functions:logs --live
```

2. Test health endpoint:
```bash
curl https://your-site.netlify.app/.netlify/functions/health
```

3. Check browser console for errors

4. Verify environment variables are set in production

5. Check for hardcoded localhost URLs

### Rollback needed

**Symptoms**: Bad deploy in production

**Solutions**:

```bash
# Via Netlify UI
# Go to Deploys → Find last good deploy → Publish deploy

# Via CLI
netlify deploy:list
netlify deploy:restore <deploy-id>

# Via API
curl -X POST -H "Authorization: Bearer <token>" \
  https://api.netlify.com/api/v1/sites/<site-id>/deploys/<deploy-id>/restore
```

## Performance Issues

### Slow page load

**Symptoms**: Pages take >3 seconds to load

**Solutions**:

1. Check asset sizes:
```bash
# Analyze bundle
ls -lh assets/css/styles.css
ls -lh assets/js/*.js
```

2. Optimize images:
```bash
# Use WebP format, compress images
# Lazy load images below fold
<img loading="lazy" src="..." alt="...">
```

3. Check caching:
```toml
# Verify cache headers in netlify.toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

4. Run Lighthouse audit:
```bash
# In Chrome DevTools
# Lighthouse → Generate report
```

### High function cold starts

**Symptoms**: First request after idle is slow

**Solutions**:

1. Reduce function bundle size:
```javascript
// Import only what you need
const { query } = require('pg');  // ❌ Imports entire pg library

// Better
const { Pool } = require('pg');  // ✅ Import specific module
```

2. Implement keep-warm strategy:
```bash
# Add scheduled function to ping endpoints
# In Netlify UI: Functions → Background functions
```

3. Cache database connections:
```javascript
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  
  cachedDb = new Pool({...});
  return cachedDb;
}
```

## Testing Issues

### Tests fail locally but pass in CI

**Symptoms**: Different test results

**Solutions**:

1. Check Node.js version:
```bash
node --version  # Should match CI version
```

2. Use clean environment:
```bash
# Use exact dependencies
rm -rf node_modules package-lock.json
npm ci  # Same as CI
```

3. Check environment variables:
```bash
# Tests might need specific env vars
DB_TYPE=sqlite npm test
```

### Tests timeout

**Symptoms**: Jest timeout exceeded

**Solutions**:

```javascript
// Increase timeout for specific test
test('slow operation', async () => {
  // Test code
}, 10000);  // 10 second timeout

// Or globally in jest.config.js
module.exports = {
  testTimeout: 10000
};
```

### Mock not working

**Symptoms**: Real API called instead of mock

**Solutions**:

```javascript
// Ensure mock is before import
jest.mock('../config/database');
const { getDb } = require('../config/database');

// Setup mock properly
getDb.mockResolvedValue({
  query: jest.fn().mockResolvedValue({ rows: [] })
});
```

## Getting More Help

### When stuck

1. **Check logs**: Always start with logs
2. **Search documentation**: Check existing docs
3. **Search GitHub issues**: Someone may have had same problem
4. **Ask team**: Slack channel or standup
5. **Create issue**: If it's a bug, document it

### Reporting bugs

Include:
- **Environment**: Local/Staging/Production
- **Steps to reproduce**: Exact steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Logs/Screenshots**: Any relevant data
- **Browser/OS**: If frontend issue

### Emergency contacts

- **Site Down**: @ops-team on Slack
- **Security Issue**: security@joshburt.com.au
- **Database Issue**: @database-admin
- **Deploy Issue**: @devops-team

## Prevention

### Best practices

1. **Test locally** before pushing
2. **Run full validation**: `npm run validate`
3. **Check staging** before production
4. **Monitor after deploy** for 15 minutes
5. **Keep documentation updated**

### Regular maintenance

- Weekly: Review error logs
- Monthly: Update dependencies
- Quarterly: Performance audit
- Annually: Security audit

---

**Last Updated**: 2025-01-01
**Maintained By**: DevOps Team
**Feedback**: Create GitHub issue or #dev-docs Slack channel
