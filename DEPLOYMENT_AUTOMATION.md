# Deployment Automation Guide

## Overview

This guide covers automated deployment processes, pre-deployment checks, rollback procedures, and deployment notifications for joshburt.com.au.

## Deployment Architecture

```
┌─────────────────┐
│   Developer     │
│  Local Changes  │
└────────┬────────┘
         │ git push
         ↓
┌─────────────────┐
│  GitHub Actions │
│   CI Pipeline   │
└────────┬────────┘
         │ Tests Pass
         ↓
┌─────────────────┐
│     Staging     │
│  Auto-Deploy    │
└────────┬────────┘
         │ Manual Approval
         ↓
┌─────────────────┐
│   Production    │
│  Auto-Deploy    │
└─────────────────┘
```

## Pre-Deployment Checks

### Automated Checks in CI/CD

All checks must pass before deployment:

1. **Linting**: Code style and quality
2. **Unit Tests**: Component-level tests
3. **Integration Tests**: API and cross-component tests
4. **Build**: CSS compilation succeeds
5. **Security Scan**: No high/critical vulnerabilities
6. **Migration Check**: Migrations are ready to apply

### Pre-Deployment Script

Create `scripts/pre-deploy-check.sh`:

```bash
#!/bin/bash
# Pre-deployment validation script

set -e  # Exit on any error

echo "🔍 Starting pre-deployment checks..."

# Check 1: Linting
echo "\n📝 Running linters..."
npm run lint || { echo "❌ Linting failed"; exit 1; }

# Check 2: Build
echo "\n🏗️  Building CSS..."
npm run build:css || { echo "❌ Build failed"; exit 1; }

# Check 3: Tests
echo "\n🧪 Running tests..."
npm test || { echo "❌ Tests failed"; exit 1; }

# Check 4: Migration check
echo "\n📊 Checking migrations..."
node scripts/run-migrations.js --dry-run || { echo "❌ Migration check failed"; exit 1; }

# Check 5: Security audit
echo "\n🔒 Running security audit..."
npm audit --production --audit-level=high || { echo "⚠️  Security issues found"; exit 1; }

# Check 6: Environment variables check
echo "\n🔐 Verifying required environment variables..."
if [ -z "$JWT_SECRET" ]; then
  echo "❌ JWT_SECRET not set"
  exit 1
fi

echo "\n✅ All pre-deployment checks passed!"
echo "Ready to deploy 🚀"
```

Make it executable:

```bash
chmod +x scripts/pre-deploy-check.sh
```

## Deployment Workflows

### GitHub Actions Deployment

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [ staging ]
  workflow_dispatch:

jobs:
  pre-deploy-checks:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run pre-deployment checks
        env:
          DB_TYPE: sqlite
          JWT_SECRET: test-secret
        run: |
          chmod +x scripts/pre-deploy-check.sh
          ./scripts/pre-deploy-check.sh

      - name: Build summary
        if: success()
        run: |
          echo "### ✅ Pre-deployment checks passed" >> $GITHUB_STEP_SUMMARY
          echo "Ready to deploy to staging" >> $GITHUB_STEP_SUMMARY

  deploy-staging:
    needs: pre-deploy-checks
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Netlify Staging
        uses: netlify/actions/cli@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_STAGING_SITE_ID }}
        with:
          args: deploy --prod --message "Deploy from GitHub Actions"

      - name: Run migrations on staging
        env:
          NEON_DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: |
          npm ci
          node scripts/run-migrations.js

      - name: Send notification
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Smoke test
        run: |
          sleep 10  # Wait for deployment to stabilize
          curl -f https://staging--joshburt.netlify.app/.netlify/functions/health || exit 1
```

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  release:
    types: [published]
  workflow_dispatch:

jobs:
  pre-deploy-checks:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run pre-deployment checks
        env:
          DB_TYPE: postgres
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
        run: |
          chmod +x scripts/pre-deploy-check.sh
          ./scripts/pre-deploy-check.sh

  deploy-production:
    needs: pre-deploy-checks
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://joshburt.com.au
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Create deployment record
        id: deployment
        uses: actions/github-script@v7
        with:
          script: |
            const deployment = await github.rest.repos.createDeployment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.sha,
              environment: 'production',
              auto_merge: false,
              required_contexts: []
            });
            return deployment.data.id;

      - name: Deploy to Netlify Production
        id: deploy
        uses: netlify/actions/cli@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        with:
          args: deploy --prod --message "Production release ${{ github.ref_name }}"

      - name: Run migrations on production
        env:
          NEON_DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: |
          npm ci
          node scripts/run-migrations.js

      - name: Update deployment status
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: '${{ steps.deployment.outputs.result }}',
              state: '${{ job.status }}' === 'success' ? 'success' : 'failure',
              environment_url: 'https://joshburt.com.au',
              log_url: `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
            });

      - name: Send success notification
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: '🚀 Production deployment successful!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Send failure notification
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: '❌ Production deployment failed! Investigate immediately.'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Smoke test production
        run: |
          sleep 15  # Wait for deployment to stabilize
          curl -f https://joshburt.com.au/.netlify/functions/health || exit 1
          echo "✅ Production health check passed"
```

## Automatic Rollback

### Netlify Automatic Rollback

Netlify keeps deployment history. To auto-rollback on errors:

1. **Enable Deploy Notifications**:
   - Go to Netlify dashboard → Settings → Deploy notifications
   - Add outgoing webhook for failed deploys

2. **Rollback Script**:

Create `scripts/rollback.sh`:

```bash
#!/bin/bash
# Automatic rollback script

SITE_ID="$1"
NETLIFY_TOKEN="$2"

if [ -z "$SITE_ID" ] || [ -z "$NETLIFY_TOKEN" ]; then
  echo "Usage: ./rollback.sh <site-id> <netlify-token>"
  exit 1
fi

echo "🔄 Initiating rollback..."

# Get last successful deploy
LAST_DEPLOY=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys?per_page=10" | \
  jq -r '.[] | select(.state == "ready") | .id' | head -n 2 | tail -n 1)

if [ -z "$LAST_DEPLOY" ]; then
  echo "❌ No previous successful deployment found"
  exit 1
fi

echo "Rolling back to deploy: $LAST_DEPLOY"

# Restore deploy
curl -X POST -H "Authorization: Bearer $NETLIFY_TOKEN" \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys/$LAST_DEPLOY/restore"

echo "✅ Rollback initiated"
```

### Monitoring-Based Rollback

Create a monitoring script that watches for errors:

```javascript
// scripts/monitor-and-rollback.js
const https = require('https');

const HEALTH_URL = 'https://joshburt.com.au/.netlify/functions/health';
const MAX_FAILURES = 3;
const CHECK_INTERVAL = 30000; // 30 seconds

let failureCount = 0;

function checkHealth() {
  https.get(HEALTH_URL, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Health check passed');
      failureCount = 0;
    } else {
      failureCount++;
      console.error(`❌ Health check failed (${failureCount}/${MAX_FAILURES})`);
      
      if (failureCount >= MAX_FAILURES) {
        console.error('🚨 Initiating automatic rollback!');
        rollback();
      }
    }
  }).on('error', (err) => {
    failureCount++;
    console.error(`❌ Health check error (${failureCount}/${MAX_FAILURES}):`, err.message);
    
    if (failureCount >= MAX_FAILURES) {
      rollback();
    }
  });
}

function rollback() {
  // Execute rollback script
  const { exec } = require('child_process');
  exec('./scripts/rollback.sh', (error, stdout, stderr) => {
    if (error) {
      console.error('Rollback failed:', error);
      // Send critical alert
      process.exit(1);
    }
    console.log('Rollback output:', stdout);
  });
}

// Start monitoring
console.log('🔍 Starting deployment monitoring...');
setInterval(checkHealth, CHECK_INTERVAL);
checkHealth(); // Initial check
```

## Deployment Notifications

### Slack Notifications

Set up Slack webhook in GitHub Secrets as `SLACK_WEBHOOK`, then add to workflows:

```yaml
- name: Send deployment notification
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: |
      Deployment to ${{ github.event.inputs.environment || 'production' }}
      Status: ${{ job.status }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
    fields: repo,message,commit,author,action,eventName,ref,workflow
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Discord Notifications

For Discord, create a webhook and use:

```yaml
- name: Send Discord notification
  if: always()
  run: |
    curl -H "Content-Type: application/json" \
      -d '{
        "content": "🚀 Deployment '${{ job.status }}'",
        "embeds": [{
          "title": "Deployment to Production",
          "color": '${{ job.status == 'success' && '3066993' || '15158332' }}',
          "fields": [
            {"name": "Status", "value": "${{ job.status }}", "inline": true},
            {"name": "Environment", "value": "production", "inline": true},
            {"name": "Commit", "value": "${{ github.sha }}", "inline": false},
            {"name": "Author", "value": "${{ github.actor }}", "inline": true}
          ]
        }]
      }' \
      ${{ secrets.DISCORD_WEBHOOK }}
```

### Email Notifications

GitHub Actions can send email notifications automatically:

1. Go to repository Settings → Notifications
2. Enable email notifications for workflow runs
3. Add team email addresses

Or use a custom email action:

```yaml
- name: Send email notification
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.SMTP_USERNAME }}
    password: ${{ secrets.SMTP_PASSWORD }}
    subject: '🚨 Production Deployment Failed'
    to: ops@joshburt.com.au
    from: github-actions@joshburt.com.au
    body: |
      Production deployment failed!
      
      Workflow: ${{ github.workflow }}
      Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
```

## Rollback Procedures

### Manual Rollback via Netlify

1. **Via Netlify UI**:
   - Go to Deploys tab
   - Find last successful deploy
   - Click "Publish deploy"

2. **Via Netlify CLI**:
   ```bash
   # List recent deploys
   netlify deploy:list
   
   # Restore specific deploy
   netlify deploy:restore <deploy-id>
   ```

3. **Via API**:
   ```bash
   # Get last successful deploy
   LAST_DEPLOY=$(curl -H "Authorization: Bearer $NETLIFY_TOKEN" \
     "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys?per_page=5" | \
     jq -r '.[] | select(.state == "ready") | .id' | head -n 2 | tail -n 1)
   
   # Restore it
   curl -X POST -H "Authorization: Bearer $NETLIFY_TOKEN" \
     "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys/$LAST_DEPLOY/restore"
   ```

### Database Rollback

For database migrations that need rollback:

1. **If rollback script exists**:
   ```bash
   psql "$PRODUCTION_DATABASE_URL" -f migrations/XXX_migration_rollback.sql
   ```

2. **Manual rollback**:
   ```bash
   # Connect to database
   psql "$PRODUCTION_DATABASE_URL"
   
   # Reverse migration changes manually
   # Then remove migration record
   DELETE FROM migrations WHERE version = 'XXX';
   ```

3. **Restore from backup** (last resort):
   ```bash
   # Stop application traffic
   # Restore database from backup
   pg_restore -d database_name backup_file.dump
   ```

### Code Rollback via Git

```bash
# Identify last good commit
git log --oneline

# Create rollback branch
git checkout -b rollback-emergency <last-good-commit>

# Push and deploy
git push origin rollback-emergency

# Trigger deployment manually if needed
```

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing in CI
- [ ] Code reviewed and approved
- [ ] Tested on staging environment
- [ ] Database migrations prepared and tested
- [ ] Environment variables updated (if needed)
- [ ] Backup created (for major changes)
- [ ] Team notified of deployment window
- [ ] Rollback plan documented

### During Deployment

- [ ] Monitor deployment logs
- [ ] Watch for errors in Netlify build
- [ ] Verify migrations applied successfully
- [ ] Check health endpoint after deploy
- [ ] Test critical user flows
- [ ] Monitor error rates

### Post-Deployment

- [ ] Verify site is accessible
- [ ] Run smoke tests
- [ ] Check error tracking (Sentry)
- [ ] Monitor performance metrics
- [ ] Verify database changes
- [ ] Notify team of successful deployment
- [ ] Update documentation if needed
- [ ] Close deployment issue/ticket

## Monitoring Deployments

### Real-time Monitoring

```bash
# Watch Netlify deploy logs
netlify logs --live

# Watch function logs
netlify functions:logs --live

# Monitor health endpoint
watch -n 5 'curl -s https://joshburt.com.au/.netlify/functions/health | jq'
```

### Post-Deployment Health Check Script

```bash
#!/bin/bash
# scripts/post-deploy-check.sh

BASE_URL="$1"

if [ -z "$BASE_URL" ]; then
  echo "Usage: ./post-deploy-check.sh <base-url>"
  exit 1
fi

echo "🔍 Running post-deployment checks on $BASE_URL"

# Check 1: Health endpoint
echo "\n1️⃣  Checking health endpoint..."
HEALTH=$(curl -s "$BASE_URL/.netlify/functions/health")
STATUS=$(echo "$HEALTH" | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  echo "❌ Health check failed: $STATUS"
  exit 1
fi
echo "✅ Health check passed"

# Check 2: Auth endpoint
echo "\n2️⃣  Checking auth endpoint..."
AUTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/.netlify/functions/auth?action=me")
if [ "$AUTH_RESPONSE" != "401" ]; then
  echo "⚠️  Unexpected auth response: $AUTH_RESPONSE"
fi
echo "✅ Auth endpoint responding"

# Check 3: Products endpoint
echo "\n3️⃣  Checking products endpoint..."
PRODUCTS=$(curl -s "$BASE_URL/.netlify/functions/products")
PRODUCT_COUNT=$(echo "$PRODUCTS" | jq 'length')
echo "   Found $PRODUCT_COUNT products"
echo "✅ Products endpoint responding"

# Check 4: Static pages
echo "\n4️⃣  Checking static pages..."
for page in "" "/login.html" "/administration.html"; do
  RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$page")
  if [ "$RESPONSE" != "200" ]; then
    echo "❌ Page $page returned $RESPONSE"
    exit 1
  fi
done
echo "✅ All static pages loading"

echo "\n✨ All post-deployment checks passed!"
```

## Emergency Procedures

### Site Down

1. Check Netlify status page
2. Check function logs for errors
3. Verify database connectivity
4. Roll back to last known good deploy
5. Notify team immediately

### Database Issues

1. Check database logs
2. Verify connection credentials
3. Check for migration failures
4. Consider database rollback if recent migration
5. Restore from backup if needed

### Deployment Stuck

1. Cancel deploy in Netlify UI
2. Check build logs for errors
3. Fix issues and redeploy
4. If persistent, deploy via CLI

## Resources

- [Netlify Deploy Contexts](https://docs.netlify.com/site-deploys/overview/)
- [GitHub Actions Deployment](https://docs.github.com/en/actions/deployment/about-deployments)
- [Database Migrations Guide](DATABASE_MIGRATIONS.md)
- [Rollback Runbook](ROLLBACK_RUNBOOK.md)

## Support

For deployment issues:
- Check Netlify build logs
- Review function logs
- Run post-deployment checks
- Contact DevOps team
- Create incident in GitHub
