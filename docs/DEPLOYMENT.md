# Deployment Guide# Deployment Guide (Serverless Architecture)

Complete deployment procedures for joshburt.com.au across all environments.The application runs as a static frontend plus Netlify Functions (serverless backend). All dynamic features are provided by serverless endpoints with automated deployment pipelines.

## Table of Contents## Table of Contents

- [Overview](#overview)

- [Overview](#overview)- [Deployment Workflows](#deployment-workflows)

- [Prerequisites](#prerequisites)- [Environment Setup](#environment-setup)

- [Local Development](#local-development)- [Database Migrations](#database-migrations)

- [Netlify Deployment](#netlify-deployment)- [Monitoring & Health Checks](#monitoring--health-checks)

- [FTP Mirror Deployment](#ftp-mirror-deployment)- [Rollback Procedures](#rollback-procedures)

- [Environment Variables](#environment-variables)- [Troubleshooting](#troubleshooting)

- [Database Setup](#database-setup)

- [Post-Deployment](#post-deployment)## Overview

- [Rollback Procedures](#rollback-procedures)

### Architecture

---- **Frontend**: Static HTML/CSS/JavaScript

- **Backend**: Netlify Serverless Functions

## Overview- **Database**: PostgreSQL (Neon)

- **CI/CD**: GitHub Actions (automated)

### Deployment Strategy- **Monitoring**: Custom metrics and logging

- **Primary**: Netlify (static + serverless functions)### Deployment Targets

- **Mirror**: FTP server (static files only, optional)1. **Netlify (Primary)**: Automatic deployment on push

- **CI/CD**: GitHub Actions for automated deployments2. **FTP Mirror (Secondary)**: Static file backup

### Environments## Deployment Workflows

| Environment | URL | Deployment |### Automatic Deployment (Main Branch)

|-------------|-----|------------|

| **Local** | `http://localhost:8888` | Manual (`npm run dev:functions`) |Every push to the `main` branch triggers:

| **Production (Netlify)** | `https://joshburt.netlify.app` | Auto (push to `main`) |

| **Mirror (FTP)** | `https://joshburt.com.au` | Auto (GitHub Actions) |```

┌─────────────────────────────────────────────────────────┐

---│ 1. Pre-Deployment Checks │

│ ├─ Install dependencies │

## Prerequisites│ ├─ Run database migrations (dry-run) │

│ ├─ Lint code (ESLint + HTMLHint) │

### Required Software│ ├─ Build CSS (Tailwind) │

│ └─ Run tests (Jest) │

- **Node.js**: 18+ (LTS)│ │

- **npm**: 9+│ 2. Deployment │

- **Git**: Any recent version│ ├─ Deploy to FTP server │

- **Netlify CLI**: `npm install -g netlify-cli` (for local functions)│ └─ Deploy to Netlify (automatic) │

│ │

### Required Accounts│ 3. Post-Deployment │

│ ├─ Run database migrations (production) │

- **GitHub**: For code repository│ ├─ Send deployment notification │

- **Netlify**: For hosting + serverless functions│ └─ Generate deployment summary │

- **Neon** (or PostgreSQL provider): For database└─────────────────────────────────────────────────────────┘

- **FTP Server** (optional): For mirror deployment```

---**Workflow File**: `.github/workflows/main.yml`

## Local Development**Key Features**:

- ✅ Automatic rollback instructions on failure

### Initial Setup- ✅ Dry-run migrations before deployment

- ✅ Comprehensive deployment summaries

```bash- ✅ Deployment notifications

# 1. Clone repository- ✅ Failed deployment tracking

git clone https://github.com/SmokeHound/joshburt.com.au.git

cd joshburt.com.au### Nightly Maintenance (2 AM UTC Daily)



# 2. Install dependenciesAutomated maintenance tasks:

npm install

```

# 3. Create environment file┌─────────────────────────────────────────────────────────┐

cp .env.example .env│ 1. Security Audit │

# Edit .env with your credentials (see Environment Variables section)│ └─ Run npm audit (production dependencies) │

│ │

# 4. Run database migrations│ 2. Database Cleanup │

npm run migrate│ └─ Prune expired refresh tokens │

│ │

# 5. Verify database connectivity│ 3. Dependency Check │

npm run health│ └─ Check for outdated packages │

````│ │

│  4. Code Quality                                        │

### Development Servers│     └─ Run linting checks                              │

│                                                         │

**Option 1: Static Only** (no backend)│  5. Report Generation                                   │

│     └─ Create maintenance report (artifact)            │

```bash└─────────────────────────────────────────────────────────┘

npm run dev```

# Serves on http://localhost:8000

# Use for frontend-only development**Workflow File**: `.github/workflows/nightly-maintenance.yml`

````

**Artifacts**: Maintenance reports retained for 30 days

**Option 2: Full-Stack** (static + serverless)

### Weekly Performance Reports (Monday 9 AM UTC)

````bash

npm run dev:functionsAutomated performance analysis:

# Serves on http://localhost:8888

# Functions available at /.netlify/functions/*```

# Use for full feature testing┌─────────────────────────────────────────────────────────┐

```│  1. Generate Weekly Report                              │

│     ├─ Analyze metrics data                            │

**Option 3: Both** (recommended)│     ├─ Calculate performance statistics                │

│     ├─ Identify trends and issues                      │

```bash│     └─ Generate recommendations                        │

# Terminal 1│                                                         │

npm run dev│  2. Upload Report                                       │

│     └─ Save as workflow artifact (90 days)             │

# Terminal 2│                                                         │

npm run dev:functions│  3. Create Summary                                      │

```│     └─ Post summary to GitHub Actions                  │

└─────────────────────────────────────────────────────────┘

### Testing Before Deploy```



```bash**Workflow File**: `.github/workflows/weekly-report.yml`

# Run all validation

npm run validate**Artifacts**: Weekly reports retained for 90 days



# Individual checks## Environment Setup

npm test              # Jest tests

npm run test:functions  # Function smoke tests### Netlify Configuration

npm run lint          # Code quality

npm run build:css     # CSS compilation1. **Connect Repository**

```   - Log into Netlify dashboard

   - Click "New site from Git"

---   - Select GitHub repository

   - Configure build settings:

## Netlify Deployment     - Build command: `npm run build`

     - Publish directory: `/`

### Initial Setup     - Functions directory: `.netlify/functions`



#### 1. Connect Repository2. **Environment Variables**



1. Log in to [Netlify](https://app.netlify.com/)Required variables:

2. Click "Add new site" → "Import an existing project"```

3. Connect to GitHubJWT_SECRET=your-super-secure-jwt-secret

4. Select `SmokeHound/joshburt.com.au` repositoryJWT_EXPIRES_IN=7d

5. Configure build settings:JWT_REFRESH_EXPIRES_IN=30d

   - **Build command**: `npm run build:css`BCRYPT_ROUNDS=12

   - **Publish directory**: `.` (root)DB_TYPE=postgres

   - **Functions directory**: `netlify/functions`# PostgreSQL credentials required: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

````

#### 2. Configure Environment VariablesOptional:

````

Navigate to **Site Settings → Environment Variables** and add:SMTP_HOST=...

SMTP_PORT=...

```SMTP_USER=...

# Database (required)SMTP_PASS=...

DB_HOST=your-db-host.neon.techFROM_EMAIL=...

DB_PORT=5432GOOGLE_CLIENT_ID=...

DB_USER=your-usernameGOOGLE_CLIENT_SECRET=...

DB_PASSWORD=your-passwordGITHUB_CLIENT_ID=...

DB_NAME=your-databaseGITHUB_CLIENT_SECRET=...

APPLY_SCHEMA_ON_START=false

# JWT (required)AUTH0_DOMAIN=your-tenant.us.auth0.com

JWT_SECRET=your-secret-key-min-32-charsAUTH0_CLIENT_ID=your-client-id

AUTH0_AUDIENCE=optional-api-audience

# Auth0 (optional)AUTH0_AUTO_PROVISION=true

AUTH0_DOMAIN=your-tenant.auth0.com```

AUTH0_CLIENT_ID=your-client-id

AUTH0_AUDIENCE=https://your-api-identifier### GitHub Secrets (for CI/CD)



# Email (optional)Required for automated deployments:

SMTP_HOST=smtp.example.com

SMTP_PORT=587```

SMTP_USER=your-email@example.com# FTP Deployment

SMTP_PASSWORD=your-smtp-passwordFTP_SERVER=ftp.yourserver.com

```FTP_USERNAME=your-username

FTP_PASSWORD=your-password

#### 3. DeployFTP_REMOTE_DIRECTORY=/public_html/



Netlify auto-deploys on every push to `main` branch:# Database (for migrations in CI)

DB_TYPE=postgres

```bashDB_HOST=your-db-host

git add .DB_PORT=5432

git commit -m "Deploy: your message"DB_USER=your-db-user

git push origin mainDB_PASSWORD=your-db-password

```DB_NAME=your-db-name

````

**Build Process**:

1. Install dependencies (`npm install`)**To add secrets**:

2. Build CSS (`npm run build:css`)1. Go to GitHub repository settings

3. Deploy static files to CDN2. Navigate to Secrets and variables > Actions

4. Deploy functions to serverless runtime3. Click "New repository secret"

5. Add each secret individually

**Deployment Time**: ~2-3 minutes

### Local Development

### Manual Deploy

1. **Clone Repository**

`bash`bash

# Using Netlify CLIgit clone https://github.com/SmokeHound/joshburt.com.au.git

netlify deploy --prodcd joshburt.com.au

```````

# Or via dashboard

# Deploys → Trigger deploy → Deploy site2. **Install Dependencies**

``````bash

npm install

### Netlify Configuration```



**File**: `netlify.toml`3. **Create Environment File**

```bash

```tomlcp .env.example .env

[build]# Edit .env with your local settings

  command = "npm run build:css"```

  publish = "."

  functions = "netlify/functions"4. **Run Development Server**

```bash

[build.environment]# Static assets only

  NODE_VERSION = "18"npm run dev



[[redirects]]# With serverless functions

  from = "/*"npm run dev:functions

  to = "/index.html"```

  status = 200

5. **Run Tests**

[[headers]]```bash

  for = "/assets/*"npm test

  [headers.values]```

    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```````

### Monitoring Deployments

on:);

push:

    branches:CREATE INDEX idx_new_feature_name ON new_feature(name);

      - main```

jobs:3. **Test Locally**

deploy:```bash

    runs-on: ubuntu-latest# Dry run first

    node scripts/run-migrations.js --dry-run

    steps:

      - name: Checkout code# Apply if looks good

        uses: actions/checkout@v3node scripts/run-migrations.js

      ```

      - name: Setup Node.js

        uses: actions/setup-node@v34. **Commit and Push**

        with:```bash

          node-version: '18'git add migrations/004_add_new_feature.sql

      git commit -m "feat: add new feature table"

      - name: Install dependenciesgit push

        run: npm install```



      - name: Build CSSThe CI/CD pipeline will automatically apply the migration on deployment.

        run: npm run build:css

      ### Migration Best Practices

      - name: Deploy to FTP

        uses: SamKirkland/FTP-Deploy-Action@4.3.0- ✅ **Keep migrations small**: One logical change per migration

        with:- ✅ **Test locally first**: Always dry-run before committing

          server: ${{ secrets.FTP_SERVER }}- ✅ **Make backwards compatible**: Avoid breaking changes when possible

          username: ${{ secrets.FTP_USERNAME }}- ✅ **Add indexes**: For frequently queried columns

          password: ${{ secrets.FTP_PASSWORD }}- ✅ **Use transactions**: Wrap related changes

          local-dir: ./- ❌ **Never edit applied migrations**: Create new ones instead

          server-dir: /public_html/- ❌ **Don't delete migration files**: Keep history intact

          exclude: |

            **/.git*## Monitoring & Health Checks

            **/.git*/**

            **/node_modules/**### Health Check Endpoint

            **/.env

````bash

# Check application health

### Deploymentcurl https://joshburt.com.au/.netlify/functions/health

```

Auto-deploys on push to `main` branch (same as Netlify).

**Response**:

**Note**: FTP mirror serves **static files only** (no serverless functions).```json

{

---  "status": "healthy",

  "timestamp": "2025-10-31T10:00:00.000Z",

## Environment Variables  "database": {

    "status": "connected",

### Complete Reference    "latencyMs": 5

  },

| Variable | Required | Default | Description |  "uptime": 12345,

|----------|----------|---------|-------------|  "memory": {

| `DB_HOST` | ✅ | - | PostgreSQL hostname |    "heapUsed": 50,

| `DB_PORT` | ❌ | `5432` | PostgreSQL port |    "heapTotal": 100

| `DB_USER` | ✅ | - | Database username |  }

| `DB_PASSWORD` | ✅ | - | Database password |}

| `DB_NAME` | ✅ | - | Database name |```

| `DB_SSL` | ❌ | `true` | Enable SSL connection |

| `DATABASE_URL` | ❌ | - | Full connection string (alternative to individual vars) |### Metrics Endpoint

| `JWT_SECRET` | ✅ | - | JWT signing secret (min 32 chars) |

| `JWT_EXPIRES_IN` | ❌ | `7d` | Access token lifetime |```bash

| `JWT_REFRESH_EXPIRES_IN` | ❌ | `30d` | Refresh token lifetime |# Get metrics summary

| `AUTH0_DOMAIN` | ❌ | - | Auth0 tenant domain |curl https://joshburt.com.au/.netlify/functions/metrics?action=summary

| `AUTH0_CLIENT_ID` | ❌ | - | Auth0 client ID |

| `AUTH0_AUDIENCE` | ❌ | - | Auth0 API identifier |# Check for alerts

| `SMTP_HOST` | ❌ | - | SMTP server hostname |curl https://joshburt.com.au/.netlify/functions/metrics?action=alerts

| `SMTP_PORT` | ❌ | `587` | SMTP server port |

| `SMTP_USER` | ❌ | - | SMTP username |# Endpoint-specific metrics

| `SMTP_PASSWORD` | ❌ | - | SMTP password |curl https://joshburt.com.au/.netlify/functions/metrics?action=endpoint&endpoint=/users

| `BCRYPT_ROUNDS` | ❌ | `12` | Password hashing rounds |```

| `APPLY_SCHEMA_ON_START` | ❌ | `0` | Auto-apply database schema (1=yes, 0=no) |

### Log Aggregation

### Security Best Practices

Logs are collected in `data/logs/` directory:

1. **Never commit** `.env` files to Git (already in `.gitignore`)- Daily rotation: `app-YYYY-MM-DD.log`

2. **Use strong secrets**: Min 32 characters for `JWT_SECRET`- JSON format for easy parsing

3. **Rotate secrets**: Change `JWT_SECRET` periodically (invalidates all tokens)- Automatic cleanup (30-day retention)

4. **Scope Auth0**: Use specific audience for API authorization

5. **Separate environments**: Use different credentials for dev/staging/prod**Query logs programmatically**:

```javascript

---const { getLogAggregator } = require('./utils/log-aggregator');

const logger = getLogAggregator();

## Database Setup

// Get recent error logs

### Neon PostgreSQL (Recommended)const errors = await logger.query({

  level: 'ERROR',

#### 1. Create Database  limit: 100

});

1. Sign up at [Neon](https://neon.tech/)```

2. Create new project

3. Copy connection details:### Performance Reports

   - Host, Port, Database, User, Password

4. Add to environment variablesWeekly reports are automatically generated and available as GitHub Actions artifacts.



#### 2. Apply Schema**Manual generation**:

```bash

```bashnode scripts/generate-weekly-report.js

# Option A: Manual via psql```

psql -h your-host.neon.tech -U your-user -d your-db -f database-schema.sql

Reports include:

# Option B: Via migration script- Request metrics (rate, response time, status codes)

npm run migrate- Error analysis (by severity and type)

- Performance metrics (operation durations)

# Option C: Auto-apply on function start (dev only)- Database metrics (query performance)

# Set APPLY_SCHEMA_ON_START=1 in .env- Recommendations based on thresholds

```

## Rollback Procedures

#### 3. Run Migrations

See [ROLLBACK_PROCEDURES.md](ROLLBACK_PROCEDURES.md) for detailed rollback instructions.

```bash

# Check pending migrations### Quick Rollback

node scripts/run-migrations.js --dry-run

**Application Code**:

# Apply all pending```bash

npm run migrate# Revert last commit

```git revert HEAD

git push origin main

#### 4. Verify```



```bash**Database** (if needed):

# Health check```bash

npm run health# Create rollback migration

touch migrations/005_rollback_feature.sql

# Or via curl# Add SQL to reverse changes

curl http://localhost:8888/.netlify/functions/healthnode scripts/run-migrations.js

````

### Alternative PostgreSQL Providers**Netlify**:

1. Go to Netlify dashboard

- **Supabase**: Similar setup, use connection details from dashboard2. Deploys section

- **Railway**: Automatic PostgreSQL provisioning3. Find last successful deploy

- **Heroku Postgres**: Use `DATABASE_URL` from Heroku dashboard4. Click "Publish deploy"

- **Self-hosted**: Standard PostgreSQL 14+ installation

### Automated Rollback Information

---

On deployment failure, GitHub Actions automatically:

## Post-Deployment- Identifies the failed commit

- Displays rollback instructions in summary

### Verification Checklist- Logs failure details

- Creates failure tracking information

````bash

# 1. Health check## Troubleshooting

curl https://joshburt.netlify.app/.netlify/functions/health

### Common Issues

# 2. Public endpoints

curl https://joshburt.netlify.app/.netlify/functions/public-config**1. Deployment Fails at Lint Step**

curl https://joshburt.netlify.app/.netlify/functions/public-stats```bash

# Fix locally

# 3. Login flownpm run lint -- --fix

curl -X POST https://joshburt.netlify.app/.netlify/functions/auth?action=login \git add .

  -H "Content-Type: application/json" \git commit -m "fix: resolve linting issues"

  -d '{"email":"test@example.com","password":"testpass"}'git push

````

# 4. Authenticated endpoint

curl https://joshburt.netlify.app/.netlify/functions/products \*\*2. Deployment Fails at Test Step\*\*

-H "Authorization: Bearer YOUR_TOKEN"```bash

````# Run tests locally

npm test

### Create Admin User

# Fix failing tests

```bash# Commit and push

# Via psql```

psql -h your-host.neon.tech -U your-user -d your-db

**3. Migration Fails**

# Insert admin user (password: 'admin123' hashed with bcrypt)```bash

INSERT INTO users (email, name, password_hash, role)# Check migration syntax

VALUES (node scripts/run-migrations.js --dry-run

  'admin@joshburt.com.au',

  'Administrator',# Review logs for errors

  '$2a$12$hashed_password_here',# Fix migration file

  'admin'# Test locally before pushing

);```

````

**4. Function Not Working**

Or register via UI and manually update role:- Check Netlify function logs

- Verify environment variables are set

```sql- Test locally with `netlify dev`

UPDATE users SET role = 'admin' WHERE email = 'admin@joshburt.com.au';- Check database connectivity

````

**5. Database Connection Issues**

### Configure Site Settings- Verify `DB_*` environment variables

- Check database server status

1. Log in as admin- Test connection manually

2. Navigate to `settings.html`- Review firewall rules

3. Update:

   - Site title, description### Debug Mode

   - Theme and colors

   - Feature flagsEnable debug logging:

   - Registration enabled/disabled```bash

export DEBUG=true

---export NODE_ENV=development

npm run dev:functions

## Rollback Procedures```



### Netlify Rollback### Support Resources



#### Via Dashboard- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)

- **API Docs**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

1. Go to **Deploys** tab- **Database**: [DATABASE.md](DATABASE.md)

2. Find previous successful deploy- **Rollback**: [ROLLBACK_PROCEDURES.md](ROLLBACK_PROCEDURES.md)

3. Click "Publish deploy"

4. Confirm rollback## Database

PostgreSQL is required. Supply credentials via env vars. The unified `config/database.js` handles connection pooling and query execution.

**Downtime**: ~30 seconds

### Migrations / Schema

#### Via CLIOn PostgreSQL, the app will best‑effort apply `database-schema.sql` at startup before creating any missing tables. If it fails, the built‑in initializers still create the required tables. Review `DATABASE.md` and `database-schema.sql` for details.



```bash## Security

# List recent deploys1. Strong `JWT_SECRET`

netlify deploy:list2. Rotate tokens by pruning `refresh_tokens` table periodically

3. Enforce HTTPS (Netlify auto) & set HSTS via Netlify headers if desired

# Rollback to specific deploy ID4. Limit origin access with Netlify site domain (optional future enhancement)

netlify deploy:publish <deploy-id>5. Audit logs available via `/.netlify/functions/audit-logs`

````

### Security/Ops Checklist (Production)

### Database Rollback- [ ] Rotate `JWT_SECRET` regularly and keep it unique per environment

- [ ] Review `JWT_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN` to match your policy

#### Point-in-Time Recovery (Neon)- [ ] Enable function logs/alerts in Netlify; set up external uptime monitoring

- [ ] Schedule `npm run prune:tokens` (via CI cron) to keep `refresh_tokens` lean

1. Neon Dashboard → Project → Restore- [ ] Decide on `APPLY_SCHEMA_ON_START` (prefer migrations for teams)

2. Select timestamp (last 7 days available)- [ ] Lock down CORS to your domains when ready (optional)

3. Create new branch or restore to main

4. Update connection strings if branch created## Performance

Caching handled mostly client-side + service worker.

#### Manual RollbackTips:

- Pre-build Tailwind: `npm run build:css`

```bash- Keep functions lean (shared DB module is reused)

# Restore from backup dump

pg_restore -h your-host.neon.tech \## Monitoring & Logs

  -U your-user \Use Netlify function logs for runtime errors. Add external monitoring (StatusCake, UptimeRobot) to root + critical endpoints.

  -d your-db \

  -v backup-20251110.dump## Default Test Credentials (Change in Production)

```

# Or restore specific migrationadmin@joshburt.com.au / admin123!

psql -h your-host.neon.tech -U your-user -d your-db \test@example.com / password

-f migrations/rollback/002_rollback_order_tracking.sqlmanager@example.com / manager123

````



### Emergency Maintenance Mode## Manual Verification Checklist

- [ ] Static pages load (index, analytics, users, oil, settings)

```sql- [ ] Auth register/login/me flows succeed against serverless function

-- Enable maintenance mode- [ ] Users list fetches from `/.netlify/functions/users`

UPDATE settings SET data = jsonb_set(data, '{maintenanceMode}', 'true');- [ ] Orders & products endpoints respond

```- [ ] Analytics dashboard renders charts (Chart.js loaded)

- [ ] Service worker installs & caches static assets

Users will see maintenance message on all pages.- [ ] No console errors referencing removed `/api/` paths



**Disable**:---

```sqlAll dynamic capability now relies on Netlify Functions; ensure environment variables are configured before first deploy.

UPDATE settings SET data = jsonb_set(data, '{maintenanceMode}', 'false');

```## Environment Variables



---### Required

- `JWT_SECRET`: Secure random string for JWT signing

## Troubleshooting- `NODE_ENV`: Set to 'production' for production deployment



### Build Failures### Optional

- `PORT`: Server port (default: 3000)

**Error**: `npm ERR! missing script: build:css`- `FRONTEND_URL`: Frontend URL for CORS and redirects

- `PRODUCTION_URL`: Production domain

**Solution**: Ensure `package.json` has script:- `BCRYPT_ROUNDS`: Password hashing rounds (default: 12)

```json

{### Email (for password reset)

  "scripts": {- `SMTP_HOST`: SMTP server host

    "build:css": "npx tailwindcss -i src/styles.css -o assets/css/styles.css --minify"- `SMTP_PORT`: SMTP server port

  }- `SMTP_USER`: SMTP username

}- `SMTP_PASS`: SMTP password

```- `FROM_EMAIL`: From email address



**Error**: `Module not found: '@netlify/functions'`### OAuth (optional)

- `GOOGLE_CLIENT_ID`: Google OAuth client ID

**Solution**: Install dependencies:- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

```bash- `GITHUB_CLIENT_ID`: GitHub OAuth client ID

npm install @netlify/functions- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret

```



### Function Errors### Avatar selection (predetermined avatars)



**Error**: `Database connection failed`The application no longer accepts arbitrary avatar uploads. Instead, users choose from a predefined set of avatars. This simplifies storage and security concerns and ensures avatars are served from trusted, cacheable URLs.



**Solution**: Verify environment variables in Netlify dashboard (DB_HOST, DB_USER, DB_PASSWORD, etc.)How it works:

- The client presents a gallery of predetermined avatar URLs (examples use DiceBear-generated avatars).

**Error**: `JWT verification failed`- When a user selects an avatar, the client POSTs `{ avatarUrl: '<url>' }` to `/.netlify/functions/users/:id/avatar`.

- The server validates the `avatarUrl` against the approved preset list and, if valid, stores it in the `avatar_url` column for that user and audit-logs the change.

**Solution**: Ensure `JWT_SECRET` is set and matches across environments

Operational notes:

### Deployment Delays- Predetermined avatar URLs are defined in the serverless function configuration and must be maintained by the development team.

- This approach avoids storing user-uploaded files and removes the need for external object storage credentials.

**Netlify slow deploys**: Check build logs for hanging processes (tests, migrations)

If you need custom avatars in the future (uploads to your hosting or object storage), open an issue and the team can reintroduce an upload flow using secure storage (S3/Cloudinary). Legacy SFTP-based uploads are considered historical and would require extra operational support; contact the dev team if you need that specifically.

**FTP timeouts**: Verify FTP credentials in GitHub Secrets, check server firewall



---## Database



## Continuous Integration### Settings Persistence



### GitHub Actions WorkflowAll site settings are now stored in the database in a single-row `settings` table as a JSON blob. The admin dashboard UI (`settings.html`) loads and saves settings via the `/settings` API endpoint. All changes are audit-logged.



**File**: `.github/workflows/ci.yml`#### Migration Notes

- If upgrading from a version using localStorage for settings, run the SQL in `DATABASE.md` to create the `settings` table and insert the default row.

```yaml- No manual migration of settings data is required; the UI will initialize defaults if the table is empty.

name: CI

#### Environment Variables

on:- No additional environment variables are required for settings persistence. Ensure your DB credentials are set as described above.

  pull_request:

    branches: [main]## Security Considerations

  push:

    branches: [main]1. **HTTPS**: Ensure HTTPS is enabled in production

2. **CORS**: Configure CORS origins for your production domains

jobs:3. **Rate Limiting**: Already configured, adjust limits as needed

  test:4. **JWT Secret**: Use a strong, unique secret key

    runs-on: ubuntu-latest5. **Database**: Secure database access and regular backups



    steps:## Performance Optimization

      - uses: actions/checkout@v3

      1. **Database**: Add indexes for frequently queried fields

      - name: Setup Node.js2. **Caching**: Implement Redis for session storage in high-traffic scenarios

        uses: actions/setup-node@v33. **CDN**: Use CDN for static assets

        with:4. **Monitoring**: Add application monitoring (New Relic, DataDog, etc.)

          node-version: '18'

      ## Monitoring

      - name: Install dependencies

        run: npm installDefault users for testing:

      - Admin: admin@joshburt.com.au / admin123!

      - name: Lint code- Test User: test@example.com / password

        run: npm run lint- Manager: manager@example.com / manager123



      - name: Run testsChange these credentials in production!
        run: npm run test:all

      - name: Build CSS
        run: npm run build:css
```

**Runs on**: Pull requests and pushes to `main`

**Prevents**: Merging code that fails tests/linting

---

## Support

- **Netlify Docs**: https://docs.netlify.com/
- **Neon Docs**: https://neon.tech/docs/
- **GitHub Actions**: https://docs.github.com/en/actions
- **Project Issues**: https://github.com/SmokeHound/joshburt.com.au/issues

---

**Last Updated**: 2025-11-11
**Maintained By**: Development Team
````
