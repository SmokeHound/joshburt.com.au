# Deployment Guide (Serverless Architecture)

The application runs as a static frontend plus Netlify Functions (serverless backend). All dynamic features are provided by serverless endpoints with automated deployment pipelines.

## Table of Contents
- [Overview](#overview)
- [Deployment Workflows](#deployment-workflows)
- [Environment Setup](#environment-setup)
- [Database Migrations](#database-migrations)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Overview

### Architecture
- **Frontend**: Static HTML/CSS/JavaScript
- **Backend**: Netlify Serverless Functions
- **Database**: PostgreSQL (Neon)
- **CI/CD**: GitHub Actions (automated)
- **Monitoring**: Custom metrics and logging

### Deployment Targets
1. **Netlify (Primary)**: Automatic deployment on push
2. **FTP Mirror (Secondary)**: Static file backup

## Deployment Workflows

### Automatic Deployment (Main Branch)

Every push to the `main` branch triggers:

```
┌─────────────────────────────────────────────────────────┐
│  1. Pre-Deployment Checks                               │
│     ├─ Install dependencies                             │
│     ├─ Run database migrations (dry-run)                │
│     ├─ Lint code (ESLint + HTMLHint)                   │
│     ├─ Build CSS (Tailwind)                            │
│     └─ Run tests (Jest)                                │
│                                                         │
│  2. Deployment                                          │
│     ├─ Deploy to FTP server                            │
│     └─ Deploy to Netlify (automatic)                   │
│                                                         │
│  3. Post-Deployment                                     │
│     ├─ Run database migrations (production)            │
│     ├─ Send deployment notification                    │
│     └─ Generate deployment summary                     │
└─────────────────────────────────────────────────────────┘
```

**Workflow File**: `.github/workflows/main.yml`

**Key Features**:
- ✅ Automatic rollback instructions on failure
- ✅ Dry-run migrations before deployment
- ✅ Comprehensive deployment summaries
- ✅ Deployment notifications
- ✅ Failed deployment tracking

### Nightly Maintenance (2 AM UTC Daily)

Automated maintenance tasks:

```
┌─────────────────────────────────────────────────────────┐
│  1. Security Audit                                      │
│     └─ Run npm audit (production dependencies)         │
│                                                         │
│  2. Database Cleanup                                    │
│     └─ Prune expired refresh tokens                    │
│                                                         │
│  3. Dependency Check                                    │
│     └─ Check for outdated packages                     │
│                                                         │
│  4. Code Quality                                        │
│     └─ Run linting checks                              │
│                                                         │
│  5. Report Generation                                   │
│     └─ Create maintenance report (artifact)            │
└─────────────────────────────────────────────────────────┘
```

**Workflow File**: `.github/workflows/nightly-maintenance.yml`

**Artifacts**: Maintenance reports retained for 30 days

### Weekly Performance Reports (Monday 9 AM UTC)

Automated performance analysis:

```
┌─────────────────────────────────────────────────────────┐
│  1. Generate Weekly Report                              │
│     ├─ Analyze metrics data                            │
│     ├─ Calculate performance statistics                │
│     ├─ Identify trends and issues                      │
│     └─ Generate recommendations                        │
│                                                         │
│  2. Upload Report                                       │
│     └─ Save as workflow artifact (90 days)             │
│                                                         │
│  3. Create Summary                                      │
│     └─ Post summary to GitHub Actions                  │
└─────────────────────────────────────────────────────────┘
```

**Workflow File**: `.github/workflows/weekly-report.yml`

**Artifacts**: Weekly reports retained for 90 days

## Environment Setup

### Netlify Configuration

1. **Connect Repository**
   - Log into Netlify dashboard
   - Click "New site from Git"
   - Select GitHub repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `/`
     - Functions directory: `.netlify/functions`

2. **Environment Variables**

Required variables:
```
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_ROUNDS=12
DB_TYPE=postgres
# PostgreSQL credentials required: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
```
Optional:
```
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
FROM_EMAIL=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
APPLY_SCHEMA_ON_START=false
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_AUDIENCE=optional-api-audience
AUTH0_AUTO_PROVISION=true
```

### GitHub Secrets (for CI/CD)

Required for automated deployments:

```
# FTP Deployment
FTP_SERVER=ftp.yourserver.com
FTP_USERNAME=your-username
FTP_PASSWORD=your-password
FTP_REMOTE_DIRECTORY=/public_html/

# Database (for migrations in CI)
DB_TYPE=postgres
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
```

**To add secrets**:
1. Go to GitHub repository settings
2. Navigate to Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret individually

### Local Development

1. **Clone Repository**
```bash
git clone https://github.com/SmokeHound/joshburt.com.au.git
cd joshburt.com.au
```

2. **Install Dependencies**
```bash
npm install
```

3. **Create Environment File**
```bash
cp .env.example .env
# Edit .env with your local settings
```

4. **Run Development Server**
```bash
# Static assets only
npm run dev

# With serverless functions
npm run dev:functions
```

5. **Run Tests**
```bash
npm test
```

## Database Migrations

### Migration System

The application uses a migration-based system for database schema changes.

**Migration Files**: Located in `migrations/` directory
- Named sequentially: `001_description.sql`, `002_description.sql`
- SQL files with DDL statements
- Tracked in `schema_migrations` table

### Running Migrations

**Dry Run (Check Pending)**:
```bash
node scripts/run-migrations.js --dry-run
```

**Apply Migrations**:
```bash
node scripts/run-migrations.js
```

**In CI/CD**:
Migrations are automatically checked (dry-run) before deployment and applied after successful deployment.

### Creating New Migrations

1. **Create Migration File**
```bash
touch migrations/004_add_new_feature.sql
```

2. **Write SQL**
```sql
-- migrations/004_add_new_feature.sql
CREATE TABLE IF NOT EXISTS new_feature (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_new_feature_name ON new_feature(name);
```

3. **Test Locally**
```bash
# Dry run first
node scripts/run-migrations.js --dry-run

# Apply if looks good
node scripts/run-migrations.js
```

4. **Commit and Push**
```bash
git add migrations/004_add_new_feature.sql
git commit -m "feat: add new feature table"
git push
```

The CI/CD pipeline will automatically apply the migration on deployment.

### Migration Best Practices

- ✅ **Keep migrations small**: One logical change per migration
- ✅ **Test locally first**: Always dry-run before committing
- ✅ **Make backwards compatible**: Avoid breaking changes when possible
- ✅ **Add indexes**: For frequently queried columns
- ✅ **Use transactions**: Wrap related changes
- ❌ **Never edit applied migrations**: Create new ones instead
- ❌ **Don't delete migration files**: Keep history intact

## Monitoring & Health Checks

### Health Check Endpoint

```bash
# Check application health
curl https://joshburt.com.au/.netlify/functions/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T10:00:00.000Z",
  "database": {
    "status": "connected",
    "latencyMs": 5
  },
  "uptime": 12345,
  "memory": {
    "heapUsed": 50,
    "heapTotal": 100
  }
}
```

### Metrics Endpoint

```bash
# Get metrics summary
curl https://joshburt.com.au/.netlify/functions/metrics?action=summary

# Check for alerts
curl https://joshburt.com.au/.netlify/functions/metrics?action=alerts

# Endpoint-specific metrics
curl https://joshburt.com.au/.netlify/functions/metrics?action=endpoint&endpoint=/users
```

### Log Aggregation

Logs are collected in `data/logs/` directory:
- Daily rotation: `app-YYYY-MM-DD.log`
- JSON format for easy parsing
- Automatic cleanup (30-day retention)

**Query logs programmatically**:
```javascript
const { getLogAggregator } = require('./utils/log-aggregator');
const logger = getLogAggregator();

// Get recent error logs
const errors = await logger.query({
  level: 'ERROR',
  limit: 100
});
```

### Performance Reports

Weekly reports are automatically generated and available as GitHub Actions artifacts.

**Manual generation**:
```bash
node scripts/generate-weekly-report.js
```

Reports include:
- Request metrics (rate, response time, status codes)
- Error analysis (by severity and type)
- Performance metrics (operation durations)
- Database metrics (query performance)
- Recommendations based on thresholds

## Rollback Procedures

See [ROLLBACK_PROCEDURES.md](ROLLBACK_PROCEDURES.md) for detailed rollback instructions.

### Quick Rollback

**Application Code**:
```bash
# Revert last commit
git revert HEAD
git push origin main
```

**Database** (if needed):
```bash
# Create rollback migration
touch migrations/005_rollback_feature.sql
# Add SQL to reverse changes
node scripts/run-migrations.js
```

**Netlify**:
1. Go to Netlify dashboard
2. Deploys section
3. Find last successful deploy
4. Click "Publish deploy"

### Automated Rollback Information

On deployment failure, GitHub Actions automatically:
- Identifies the failed commit
- Displays rollback instructions in summary
- Logs failure details
- Creates failure tracking information

## Troubleshooting

### Common Issues

**1. Deployment Fails at Lint Step**
```bash
# Fix locally
npm run lint -- --fix
git add .
git commit -m "fix: resolve linting issues"
git push
```

**2. Deployment Fails at Test Step**
```bash
# Run tests locally
npm test

# Fix failing tests
# Commit and push
```

**3. Migration Fails**
```bash
# Check migration syntax
node scripts/run-migrations.js --dry-run

# Review logs for errors
# Fix migration file
# Test locally before pushing
```

**4. Function Not Working**
- Check Netlify function logs
- Verify environment variables are set
- Test locally with `netlify dev`
- Check database connectivity

**5. Database Connection Issues**
- Verify `DB_*` environment variables
- Check database server status
- Test connection manually
- Review firewall rules

### Debug Mode

Enable debug logging:
```bash
export DEBUG=true
export NODE_ENV=development
npm run dev:functions
```

### Support Resources

- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Docs**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Database**: [DATABASE.md](DATABASE.md)
- **Rollback**: [ROLLBACK_PROCEDURES.md](ROLLBACK_PROCEDURES.md)

## Database
PostgreSQL is required. Supply credentials via env vars. The unified `config/database.js` handles connection pooling and query execution.

### Migrations / Schema
On PostgreSQL, the app will best‑effort apply `database-schema.sql` at startup before creating any missing tables. If it fails, the built‑in initializers still create the required tables. Review `DATABASE.md` and `database-schema.sql` for details.

## Security
1. Strong `JWT_SECRET`
2. Rotate tokens by pruning `refresh_tokens` table periodically
3. Enforce HTTPS (Netlify auto) & set HSTS via Netlify headers if desired
4. Limit origin access with Netlify site domain (optional future enhancement)
5. Audit logs available via `/.netlify/functions/audit-logs`

### Security/Ops Checklist (Production)
- [ ] Rotate `JWT_SECRET` regularly and keep it unique per environment
- [ ] Review `JWT_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN` to match your policy
- [ ] Enable function logs/alerts in Netlify; set up external uptime monitoring
- [ ] Schedule `npm run prune:tokens` (via CI cron) to keep `refresh_tokens` lean
- [ ] Decide on `APPLY_SCHEMA_ON_START` (prefer migrations for teams)
- [ ] Lock down CORS to your domains when ready (optional)

## Performance
Caching handled mostly client-side + service worker.
Tips:
- Pre-build Tailwind: `npm run build:css`
- Keep functions lean (shared DB module is reused)

## Monitoring & Logs
Use Netlify function logs for runtime errors. Add external monitoring (StatusCake, UptimeRobot) to root + critical endpoints.

## Default Test Credentials (Change in Production)
```
admin@joshburt.com.au / admin123!
test@example.com / password
manager@example.com / manager123
```

## Manual Verification Checklist
- [ ] Static pages load (index, analytics, users, oil, settings)
- [ ] Auth register/login/me flows succeed against serverless function
- [ ] Users list fetches from `/.netlify/functions/users`
- [ ] Orders & products endpoints respond
- [ ] Analytics dashboard renders charts (Chart.js loaded)
- [ ] Service worker installs & caches static assets
- [ ] No console errors referencing removed `/api/` paths

---
All dynamic capability now relies on Netlify Functions; ensure environment variables are configured before first deploy.

## Environment Variables

### Required
- `JWT_SECRET`: Secure random string for JWT signing
- `NODE_ENV`: Set to 'production' for production deployment

### Optional
- `PORT`: Server port (default: 3000)
- `FRONTEND_URL`: Frontend URL for CORS and redirects
- `PRODUCTION_URL`: Production domain
- `BCRYPT_ROUNDS`: Password hashing rounds (default: 12)

### Email (for password reset)
- `SMTP_HOST`: SMTP server host
- `SMTP_PORT`: SMTP server port  
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `FROM_EMAIL`: From email address

### OAuth (optional)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret

## Database

### Settings Persistence

All site settings are now stored in the database in a single-row `settings` table as a JSON blob. The admin dashboard UI (`settings.html`) loads and saves settings via the `/settings` API endpoint. All changes are audit-logged.

#### Migration Notes
- If upgrading from a version using localStorage for settings, run the SQL in `DATABASE.md` to create the `settings` table and insert the default row.
- No manual migration of settings data is required; the UI will initialize defaults if the table is empty.

#### Environment Variables
- No additional environment variables are required for settings persistence. Ensure your DB credentials are set as described above.

## Security Considerations

1. **HTTPS**: Ensure HTTPS is enabled in production
2. **CORS**: Configure CORS origins for your production domains
3. **Rate Limiting**: Already configured, adjust limits as needed
4. **JWT Secret**: Use a strong, unique secret key
5. **Database**: Secure database access and regular backups

## Performance Optimization

1. **Database**: Add indexes for frequently queried fields
2. **Caching**: Implement Redis for session storage in high-traffic scenarios
3. **CDN**: Use CDN for static assets
4. **Monitoring**: Add application monitoring (New Relic, DataDog, etc.)

## Monitoring

Default users for testing:
- Admin: admin@joshburt.com.au / admin123!
- Test User: test@example.com / password
- Manager: manager@example.com / manager123

Change these credentials in production!