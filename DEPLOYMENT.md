# Deployment Guide (Serverless Architecture)

The application now runs entirely as a static frontend plus Netlify Functions (no standalone Node/Express server). All dynamic features (auth, users, orders, products, audit logs, inventory, consumables) are provided by serverless endpoints.

## Primary Deployment: Netlify

Netlify builds & serves:
- Static assets (HTML/CSS/JS)
- Functions (in `.netlify/functions/*`)

### Steps
1. Connect repository to Netlify
2. Build command: (none required unless you want to run Tailwind build) `npm run build`
3. Publish directory: root (`/`)
4. Add environment variables (see below)
5. (Optional) Enable automatic deploy previews

### Local Development (Optional)
```bash
netlify dev
```
Serves static site and functions at http://localhost:8888

## Secondary Deployment (Static Mirrors)
- FTP deployment (GitHub Action) maintains a static mirror at production host
- GitHub Pages provides a static fallback (dynamic API calls will fail there)

## Serverless Endpoints
```
/.netlify/functions/auth?action=register|login|refresh|logout|forgot-password|reset-password|me
/.netlify/functions/users
/.netlify/functions/users/{id}
/.netlify/functions/users/stats/overview
/.netlify/functions/orders
/.netlify/functions/products
/.netlify/functions/audit-logs
/.netlify/functions/inventory
/.netlify/functions/consumables
/.netlify/functions/consumable-categories
```

## Environment Variables (Netlify)
Required:
```
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_ROUNDS=12
DB_TYPE=sqlite   # or postgres
DB_PATH=./database.sqlite  # if sqlite
# If Postgres set: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
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
APPLY_SCHEMA_ON_START=false  # set to true/1/yes to apply database-schema.sql on Postgres startup
```

## Database
SQLite default (bundled `database.sqlite`). For remote DB (PostgreSQL) supply credentials via env vars. The unified `config/database.js` selects driver based on `DB_TYPE`.

### Migrations / Schema
On PostgreSQL, the app will best‑effort apply `database-schema.sql` at startup before creating any missing tables. If it fails, the built‑in initializers still create the required tables. Review `DATABASE.md` and `database-schema.sql` for details.

## Security
1. Strong `JWT_SECRET`
2. Rotate tokens by pruning `refresh_tokens` table periodically
3. Enforce HTTPS (Netlify auto) & set HSTS via Netlify headers if desired
4. Limit origin access with Netlify site domain (optional future enhancement)
5. Audit logs available via `/.netlify/functions/audit-logs`

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

## Migration From Legacy Express (Completed)
Legacy Express artifacts have been fully removed. If checking out an older tag, follow upgrade guidance in `README.md` to transition fetch calls to serverless paths.

## Manual Verification Checklist
- [ ] Static pages load (index, analytics, users, oil, settings)
- [ ] Auth register/login/me flows succeed against serverless function
- [ ] Users list fetches from `/.netlify/functions/users`
- [ ] Orders & products endpoints respond
- [ ] Analytics dashboard renders charts (Chart.js loaded)
- [ ] Service worker installs & caches static assets
- [ ] No console errors referencing removed `/api/` paths

## Rollback Strategy (Discouraged)
Reintroducing Express is not recommended. For WebSockets or streaming, add a minimal edge or proxy layer while keeping business logic inside functions.

---
All dynamic capability now relies on Netlify Functions; ensure environment variables are configured before first deploy.

## Environment Variables

### Required
- `JWT_SECRET`: Secure random string for JWT signing
- `NODE_ENV`: Set to 'production' for production deployment

### Optional
- `PORT`: Server port (default: 3000)
- `DB_PATH`: SQLite database file path (default: ./database.sqlite)
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