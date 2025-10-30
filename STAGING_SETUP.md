# Staging Environment Setup Guide

## Overview

This guide walks through setting up a complete staging environment for joshburt.com.au, ensuring safe pre-production testing before deploying to production.

## Architecture

```
Development → Staging → Production
    ↓           ↓           ↓
Local DB    Staging DB   Production DB
SQLite      PostgreSQL   PostgreSQL
```

## Prerequisites

- Netlify account with access to the project
- Separate database instance for staging (Neon, Supabase, or other PostgreSQL provider)
- GitHub repository access for CI/CD configuration

## Step 1: Create Staging Netlify Site

### Option A: Via Netlify UI

1. Log in to [Netlify Dashboard](https://app.netlify.com)
2. Navigate to your production site
3. Click "Site settings" → "Build & deploy"
4. Under "Deploy contexts", enable "Branch deploys"
5. Create a new branch in your repository: `staging`
6. The staging site will auto-deploy to: `staging--joshburt.netlify.app`

### Option B: Via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to existing site or create new
netlify init

# Create staging site
netlify sites:create --name joshburt-staging

# Link staging branch
git checkout -b staging
netlify link
```

## Step 2: Create Staging Database

### Neon (Recommended for Netlify)

1. Go to [Neon Console](https://console.neon.tech)
2. Create new project: "joshburt-staging"
3. Create database: `staging_joshburt`
4. Copy connection string
5. Note: Neon provides branch-based databases which are perfect for staging

### Alternative: Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create new project: "joshburt-staging"
3. Copy PostgreSQL connection details from Settings → Database
4. Use direct connection (not pooler) for migrations

### Database Setup

Run the schema on your staging database:

```bash
# Using psql
psql "<staging-connection-string>" -f database-schema.sql

# Or using the import script
node scripts/import-to-neon.js
```

## Step 3: Configure Staging Environment Variables

### In Netlify Dashboard

1. Go to staging site → Site settings → Environment variables
2. Add the following variables (copy from `.env.staging` template):

**Required:**
```
NODE_ENV=staging
JWT_SECRET=<generate-unique-staging-secret>
DB_TYPE=postgres
NEON_DATABASE_URL=<staging-database-url>
BCRYPT_ROUNDS=10
```

**Optional but Recommended:**
```
# Email (use test SMTP like Mailtrap)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<mailtrap-user>
SMTP_PASS=<mailtrap-pass>
FROM_EMAIL=staging@joshburt.com.au

# OAuth (create staging apps)
GOOGLE_CLIENT_ID=<staging-google-client-id>
GOOGLE_CLIENT_SECRET=<staging-google-client-secret>
AUTH0_DOMAIN=<staging-tenant>.us.auth0.com
AUTH0_CLIENT_ID=<staging-auth0-client-id>

# Monitoring (separate Sentry project)
SENTRY_DSN=<staging-sentry-dsn>
SENTRY_ENVIRONMENT=staging

# Frontend URLs
FRONTEND_URL=https://staging--joshburt.netlify.app
PRODUCTION_URL=https://staging--joshburt.netlify.app

# Feature Flags (enable all for testing)
FEATURE_BETA_ENABLED=true
FEATURE_NEW_DASHBOARD_ENABLED=true
FEATURE_ADVANCED_REPORTS_ENABLED=true

# Debug
DEBUG=true
STAGING_MODE=true
```

### Generate Secrets

```bash
# Generate staging JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 4: Configure OAuth for Staging

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new OAuth credentials or duplicate production ones
3. Add authorized redirect URIs:
   - `https://staging--joshburt.netlify.app/oauth-success.html`
   - `http://localhost:8888/oauth-success.html` (for local testing)

### Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Create new tenant or application for staging
3. Configure:
   - Allowed Callback URLs: `https://staging--joshburt.netlify.app/oauth-success.html`
   - Allowed Logout URLs: `https://staging--joshburt.netlify.app/login.html`
   - Allowed Web Origins: `https://staging--joshburt.netlify.app`

## Step 5: Set Up Staging-Specific Feature Flags

Edit settings in staging database or via admin UI:

```sql
-- Enable all features for testing
UPDATE settings 
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(value, '{featureFlags,betaFeatures}', 'true'),
    '{featureFlags,newDashboard}', 'true'
  ),
  '{featureFlags,advancedReports}', 'true'
)
WHERE id = 1;
```

Or via API:
```bash
curl -X PATCH https://staging--joshburt.netlify.app/.netlify/functions/settings \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "featureFlags": {
      "betaFeatures": true,
      "newDashboard": true,
      "advancedReports": true
    }
  }'
```

## Step 6: Seed Staging Database

Create test data for staging:

```bash
# Set staging database credentials
export DB_TYPE=postgres
export NEON_DATABASE_URL="<staging-connection-string>"

# Run seed scripts
node scripts/populate-products.js
node scripts/populate-consumables.js
```

## Step 7: Configure Deployment Workflow

### Automatic Staging Deploys

The `staging` branch automatically deploys to staging environment when pushed:

```bash
# Make changes
git checkout staging
git merge main  # or make specific changes

# Deploy to staging
git push origin staging
```

### Manual Deploy to Staging

```bash
# Deploy specific branch to staging
netlify deploy --prod --site=joshburt-staging
```

## Deployment Workflow

```
┌─────────────┐
│ Development │
│   (Local)   │
└──────┬──────┘
       │ PR merged to main
       ↓
┌─────────────┐
│    Main     │
│   Branch    │
└──────┬──────┘
       │ Manual merge to staging
       ↓
┌─────────────┐
│   Staging   │  ← Test here before production
│   Branch    │
└──────┬──────┘
       │ After testing, merge staging to main
       │ and tag for production release
       ↓
┌─────────────┐
│ Production  │
│   Deploy    │
└─────────────┘
```

### Recommended Process

1. **Development**: Make changes in feature branches
2. **Testing**: Merge to `main`, run CI tests
3. **Staging**: Merge `main` to `staging`, deploy automatically
4. **Validation**: Test on staging environment
5. **Production**: Tag release, deploy to production

## Step 8: Testing the Staging Environment

### Health Check

```bash
# Check staging health
curl https://staging--joshburt.netlify.app/.netlify/functions/health

# Should return:
{
  "status": "healthy",
  "environment": "staging",
  "database": {
    "status": "connected",
    "driver": "postgresql"
  }
}
```

### Authentication Test

```bash
# Register test user
curl -X POST https://staging--joshburt.netlify.app/.netlify/functions/auth?action=register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@staging.example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'

# Login
curl -X POST https://staging--joshburt.netlify.app/.netlify/functions/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@staging.example.com",
    "password": "TestPassword123!"
  }'
```

### Full Test Suite

```bash
# Run smoke tests against staging
export BASE_URL=https://staging--joshburt.netlify.app
npm run test:functions
```

## Monitoring Staging Environment

### Set Up Staging Monitoring

1. **Uptime Monitoring**: Add staging URL to UptimeRobot
   - URL: `https://staging--joshburt.netlify.app/.netlify/functions/health`
   - Interval: 15 minutes (less frequent than production)
   - Alert: Only on extended downtime (>15 minutes)

2. **Error Tracking**: Separate Sentry project
   - Create "joshburt-staging" project in Sentry
   - Use staging DSN in environment variables
   - Filter alerts to avoid noise

3. **Logs**: Use Netlify function logs
   - Enable real-time logs: `netlify logs --site=joshburt-staging --live`
   - Review logs after deployments

## Differences from Production

| Feature | Production | Staging |
|---------|-----------|---------|
| Database | Production PostgreSQL | Separate staging PostgreSQL |
| Cache Duration | Long (1 year) | Short (1 day) |
| BCRYPT_ROUNDS | 12 | 10 (faster) |
| Rate Limits | Strict | Lenient |
| Debug Logging | Disabled | Enabled |
| Feature Flags | Selective | All enabled |
| Monitoring | Critical alerts | Relaxed alerts |
| Data Retention | Permanent | Can be reset |

## Data Management

### Resetting Staging Data

```bash
# Connect to staging database
psql "<staging-connection-string>"

# Truncate tables (keeps schema)
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE refresh_tokens CASCADE;

# Re-seed
\q
node scripts/populate-products.js
node scripts/populate-consumables.js
```

### Syncing from Production (Use Carefully!)

```bash
# Dump production (anonymize sensitive data first!)
pg_dump "<production-url>" --schema-only > schema.sql

# Import to staging
psql "<staging-url>" < schema.sql

# Never copy user passwords or tokens from production!
```

## Troubleshooting

### Staging Deploy Fails

1. Check Netlify build logs
2. Verify environment variables are set
3. Test functions locally: `netlify dev`
4. Check database connectivity

### Database Connection Errors

1. Verify connection string format
2. Check firewall rules (Neon/Supabase)
3. Ensure SSL mode is correct
4. Test connection locally: `psql "<connection-string>"`

### OAuth Not Working

1. Verify redirect URIs match staging URL exactly
2. Check OAuth credentials are staging-specific
3. Ensure FRONTEND_URL is set correctly
4. Check CORS headers in netlify.staging.toml

### Functions Timeout

1. Check database query performance
2. Increase function timeout in netlify.staging.toml
3. Review function logs for slow operations
4. Consider caching for slow endpoints

## Maintenance

### Weekly Tasks

- Review staging logs for errors
- Test new features before production
- Verify staging database is not full
- Check for outdated npm packages

### Monthly Tasks

- Reset staging data if needed
- Rotate staging JWT secrets
- Update OAuth credentials if needed
- Review and update documentation

## Security Considerations

1. **Separate Secrets**: Never use production secrets in staging
2. **Test Data**: Don't put real user data in staging
3. **Access Control**: Limit who can access staging admin
4. **SSL/TLS**: Always use HTTPS (automatic with Netlify)
5. **Monitoring**: Track but don't alert on every staging issue

## Next Steps

Once staging is set up:

1. Deploy your first change to staging
2. Run full test suite
3. Test user flows manually
4. Document any staging-specific issues
5. Create runbook for common staging tasks

## Resources

- [Netlify Docs: Deploy Contexts](https://docs.netlify.com/site-deploys/overview/#deploy-contexts)
- [Neon Docs: Branching](https://neon.tech/docs/guides/branching)
- [Database Migration Guide](DATABASE_MIGRATIONS.md)
- [Deployment Automation Guide](DEPLOYMENT_AUTOMATION.md)

## Support

For issues with staging setup:
- Check Netlify build logs
- Review function logs: `netlify logs --site=joshburt-staging`
- Test locally: `netlify dev`
- Contact DevOps team or create GitHub issue
