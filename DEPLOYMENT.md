# Deployment Guide

## Overview

This guide covers deploying the joshburt.com.au application with database integration support.

## Quick Start Commands

```bash
# Development (SQLite)
npm run dev

# Production (PostgreSQL)
npm run prod

# Initialize database manually
npm run db:init

# Reset database (development only)
npm run db:reset

# Run tests
npm run test:auth
```

## Production Deployment

### 1. PostgreSQL Setup

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE joshburt_website;
CREATE USER joshburt_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE joshburt_website TO joshburt_user;
\q
```

### 2. Environment Configuration

Create `.env` file in production:

```env
# Production Environment
NODE_ENV=production
PORT=3000

# Database Configuration
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=joshburt_website
DB_USER=joshburt_user
DB_PASSWORD=your_secure_password
DB_SSL=true

# JWT Configuration (CHANGE THESE!)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration (optional - for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@joshburt.com.au

# OAuth Configuration (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# URLs
FRONTEND_URL=https://joshburt.com.au
PRODUCTION_URL=https://joshburt.com.au

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Install Dependencies

```bash
npm install --production
```

### 4. Start Application

```bash
# Using npm script (recommended)
npm run prod

# Or directly
NODE_ENV=production node scripts/start.js
```

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/SmokeHound/joshburt.com.au.git
cd joshburt.com.au
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The application will start with SQLite database at `http://localhost:3000`

## Database Migration

### From SQLite to PostgreSQL

1. **Export SQLite data**:
```bash
sqlite3 database.sqlite .dump > export.sql
```

2. **Convert SQL syntax** (manual process):
   - Change `INTEGER PRIMARY KEY AUTOINCREMENT` to `SERIAL PRIMARY KEY`
   - Change `DATETIME` to `TIMESTAMP`
   - Convert boolean values (1/0 to true/false)
   - Update constraint syntax

3. **Import to PostgreSQL**:
```bash
psql -h localhost -U joshburt_user -d joshburt_website < converted_export.sql
```

## Process Management

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start scripts/start.js --name "joshburt-api"

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor
pm2 status
pm2 logs joshburt-api
```

### Using systemd

Create `/etc/systemd/system/joshburt-api.service`:

```ini
[Unit]
Description=Josh Burt Website API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/joshburt.com.au
ExecStart=/usr/bin/node scripts/start.js
Restart=on-failure
RestartSec=5s
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable joshburt-api
sudo systemctl start joshburt-api
sudo systemctl status joshburt-api
```

## Reverse Proxy Configuration

### Nginx

```nginx
server {
    listen 80;
    server_name api.joshburt.com.au;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.joshburt.com.au;

    # SSL Configuration
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Static files (if serving from same domain)
    location / {
        root /var/www/joshburt.com.au;
        try_files $uri $uri/ /index.html;
    }
}
```

## Monitoring and Logging

### Health Checks

```bash
# Check API health
curl https://api.joshburt.com.au/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2023-XX-XXTXX:XX:XX.XXXZ",
  "environment": "production"
}
```

### Database Monitoring

```sql
-- Check user count
SELECT COUNT(*) as total_users FROM users;

-- Check active sessions
SELECT COUNT(*) as active_tokens FROM refresh_tokens WHERE expires_at > NOW();

-- Recent activity
SELECT action, COUNT(*) as count 
FROM audit_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours' 
GROUP BY action;
```

### Log Management

```bash
# PM2 logs
pm2 logs joshburt-api --lines 100

# System logs
journalctl -u joshburt-api -f

# Application logs
tail -f /var/log/joshburt-api.log
```

## Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] Database credentials secured
- [ ] Default user passwords changed
- [ ] SSL/TLS enabled
- [ ] Firewall configured
- [ ] Rate limiting enabled
- [ ] Regular security updates
- [ ] Backup procedures in place
- [ ] Audit logging enabled
- [ ] Error logging configured

## Backup and Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U joshburt_user joshburt_website > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/var/backups/joshburt"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -h localhost -U joshburt_user joshburt_website > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

### Application Backup

```bash
# Backup application files
tar -czf joshburt_app_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=*.sqlite \
  --exclude=.git \
  /var/www/joshburt.com.au/
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection
   psql -h localhost -U joshburt_user -d joshburt_website
   ```

2. **Permission denied**
   ```sql
   -- Grant permissions
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO joshburt_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO joshburt_user;
   ```

3. **JWT errors**
   - Ensure JWT_SECRET is set and consistent
   - Check token expiration settings

4. **Rate limiting issues**
   - Check RATE_LIMIT_* environment variables
   - Monitor request patterns

### Performance Tuning

1. **Database optimization**
   ```sql
   -- Create additional indexes if needed
   CREATE INDEX idx_users_created_at ON users(created_at);
   CREATE INDEX idx_audit_logs_action ON audit_logs(action);
   ```

2. **Connection pooling**
   - Default pool size: 20 connections
   - Adjust based on load requirements

3. **Caching**
   - Consider Redis for session storage
   - Implement API response caching

## Updates and Maintenance

### Application Updates

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install --production

# Run database migrations (if any)
npm run db:init

# Restart application
pm2 restart joshburt-api
```

### Database Maintenance

```sql
-- Clean up expired tokens (manual)
DELETE FROM refresh_tokens WHERE expires_at < NOW();

-- Vacuum database (PostgreSQL)
VACUUM ANALYZE;
```

## Support

For issues and questions:
- Check logs: `pm2 logs joshburt-api`
- Review database health: `curl /api/health`
- Check documentation: `DATABASE.md`
- GitHub Issues: Create issue in repository