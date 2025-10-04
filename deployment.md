# Deployment Guide

This application now includes both a static frontend and a Node.js backend with authentication. Here are the deployment options:

## Option 1: Combined Server Deployment (Recommended)

Deploy the entire application as a Node.js app that serves both the API and static files.

### Render.com (Recommended)
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     ```
     NODE_ENV=production
     JWT_SECRET=your-super-secure-jwt-secret-change-this
     JWT_EXPIRES_IN=7d
     JWT_REFRESH_EXPIRES_IN=30d
     FRONTEND_URL=https://joshburt-com-au.onrender.com
     PRODUCTION_URL=https://joshburt.com.au
     BCRYPT_ROUNDS=12
     ```

### Heroku
1. Create new Heroku app: `heroku create your-app-name`
2. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-super-secure-jwt-secret
   # ... add other environment variables
   ```
3. Deploy: `git push heroku main`

### Railway
1. Connect GitHub repository
2. Deploy automatically with environment variables set

## Option 2: Separate Frontend/Backend Deployment

### Frontend (Static Files)
Keep existing FTP deployment for static files:
- GitHub Actions already configured in `.github/workflows/main.yml`
- Deploys to joshburt.com.au via FTP

### Backend (API Server)
Deploy Node.js backend separately on:
- Render.com, Heroku, Railway, or VPS
- Update `API_BASE` in frontend JavaScript files to point to backend URL

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