
# Database Implementation Guide (Production-Ready, Audited)

## Overview


The joshburt.com.au application supports multiple database backends:
- **MySQL** (default, recommended for production)
- **PostgreSQL** (supported, e.g. Neon)
- **SQLite** (for development and testing)

## Database Configuration

### Environment Variables

Set the following environment variables based on your deployment:


#### MySQL (Production, Default)
```env
# Database Type
DB_TYPE=mysql

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=joshburt_website
DB_USER=mysqluser
DB_PASSWORD=your-secure-password

# JWT Configuration (required)
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
```
> LEGACY NOTE: Historical documentation elsewhere may reference REST paths like `/api/users`. The live system now serves all dynamic operations via Netlify Functions at `/.netlify/functions/users`.

#### PostgreSQL (Alternative, e.g. Neon)
```env
# Database Type
DB_TYPE=postgres

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=joshburt_website
DB_USER=postgres
> LEGACY NOTE: Any prior endpoint references such as `/api/auth/refresh` are replaced by the unified function `/.netlify/functions/auth?action=refresh`.
DB_PASSWORD=your-secure-password
DB_SSL=true

# JWT Configuration (required)
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
```

#### SQLite (Development)
> LEGACY NOTE: Access audit logs via `/.netlify/functions/audit-logs` (legacy `/api/audit-logs` path removed).
```env
# Database Type (default)
DB_TYPE=sqlite

# SQLite Configuration
DB_PATH=./database.sqlite

# JWT Configuration (required)
JWT_SECRET=development-jwt-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=10
```

## Database Schema

### Settings Table

All site settings are stored as a single JSON blob in the `settings` table. This enables flexible, versioned, and auditable configuration management.

```sql
CREATE TABLE IF NOT EXISTS settings (
   id INTEGER PRIMARY KEY,
   data TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (id, data) VALUES (1, '{}');
```

#### Settings JSON Fields

The following fields are supported (see `settings.html` for UI):

- siteTitle, siteDescription, logoUrl, faviconUrl, contactEmail, supportPhone, supportAddress
- theme, primaryColor, secondaryColor, accentColor, themeSchedule
- maintenanceMode, enableRegistration, enableGuestCheckout, enableNewsletter
- googleAnalyticsId, facebookPixelId, smtpHost, smtpPort, smtpUser, smtpPassword
- customCss, customJs
- featureFlags (betaFeatures, newDashboard, advancedReports)
- sessionTimeout, maxLoginAttempts, enable2FA, auditAllActions

All changes to settings are audit-logged for compliance and traceability.

### Users Table
```sql
-- MySQL/PostgreSQL/SQLite compatible
CREATE TABLE users (
   id INTEGER PRIMARY KEY AUTO_INCREMENT,
   email VARCHAR(255) UNIQUE NOT NULL,
   name VARCHAR(255) NOT NULL,
   password_hash VARCHAR(255),
   role VARCHAR(50) DEFAULT 'user',
   is_active BOOLEAN DEFAULT true,
   email_verified BOOLEAN DEFAULT false,
   oauth_provider VARCHAR(50),
   oauth_id VARCHAR(255),
   avatar_url TEXT,
   reset_token VARCHAR(255),
   reset_token_expires BIGINT,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
   id INTEGER PRIMARY KEY AUTO_INCREMENT,
   user_id INTEGER NOT NULL,
   token_hash VARCHAR(255) NOT NULL,
   expires_at TIMESTAMP NOT NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
   id INTEGER PRIMARY KEY AUTO_INCREMENT,
   user_id INTEGER,
   action VARCHAR(255) NOT NULL,
   details TEXT,
   ip_address VARCHAR(45),
   user_agent TEXT,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

## Default Users

The system automatically creates default users on first startup:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | admin@joshburt.com.au | admin123! | System administrator |
| Manager | manager@example.com | manager123 | Content manager |
| User | test@example.com | password | Test user |

> **Security Note**: Change default passwords immediately in production!

## Database Operations

### Connection Management


The database abstraction in `config/database.js` automatically handles connections and query parameter conversion for MySQL, PostgreSQL, and SQLite:

```javascript
const { database } = require('./config/database');

// Automatically connects based on DB_TYPE environment variable
await database.connect();

// Execute queries
const user = await database.get('SELECT * FROM users WHERE email = ?', ['user@example.com']);
const users = await database.all('SELECT * FROM users WHERE is_active = ?', [true]);
await database.run('INSERT INTO users (email, name) VALUES (?, ?)', ['new@user.com', 'New User']);

// Close connection
await database.close();
```

### Query Parameter Conversion


The database class automatically converts query parameters:
- **SQLite/MySQL**: Uses `?` placeholders
- **PostgreSQL**: Converts to `$1, $2, $3...` placeholders

Example:
```javascript
// Write once, works with both databases
await database.get('SELECT * FROM users WHERE email = ? AND is_active = ?', ['user@example.com', true]);

// SQLite: SELECT * FROM users WHERE email = ? AND is_active = ?
// PostgreSQL: SELECT * FROM users WHERE email = $1 AND is_active = $2
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| POST | `/api/auth/register` | Register new user | None |
| POST | `/api/auth/login` | User login | None |
| POST | `/api/auth/logout` | User logout | Required |
| POST | `/api/auth/refresh` | Refresh tokens | None |
| GET | `/api/auth/me` | Get user profile | Required |
| POST | `/api/auth/forgot-password` | Request password reset | None |
| POST | `/api/auth/reset-password` | Reset password with token | None |

### User Management Endpoints

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/api/users` | List all users | Manager/Admin |
| GET | `/api/users/:id` | Get user by ID | Manager/Admin |
| POST | `/api/users` | Create new user | Admin |
| PUT | `/api/users/:id` | Update user | Admin (or own profile) |
| DELETE | `/api/users/:id` | Delete user | Admin |
| PUT | `/api/users/:id/password` | Change password | Admin (or own profile) |
| GET | `/api/users/stats/overview` | User statistics | Manager/Admin |

## Security Features

### Password Security
- **bcrypt hashing** with configurable rounds (default: 12 for production, 10 for development)
- **Password strength validation** with regex requirements
- **Salt rounds** configurable via `BCRYPT_ROUNDS` environment variable
- **No plaintext passwords or debug logic in production**

### JWT Token Management
- **Access tokens** with configurable expiration (default: 7 days)
- **Refresh tokens** with longer expiration (default: 30 days)  
- **Token hashing** in database for security
- **Automatic cleanup** of expired refresh tokens

### Rate Limiting
- **Authentication endpoints** limited to 5 attempts per 15 minutes
- **General API endpoints** limited to 100 requests per 15 minutes
- **Configurable limits** via environment variables

### Audit Logging
- **User actions** automatically logged with IP address and user agent
- **Timestamps** for all critical operations
- **Detailed audit trail** for compliance and security monitoring
- **No debug or non-production logging in codebase**

## Database Migration


### From SQLite to MySQL or PostgreSQL

1. **Set up PostgreSQL database**:
```sql
CREATE DATABASE joshburt_website;
CREATE USER joshburt_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE joshburt_website TO joshburt_user;
```

2. **Update environment variables**:
```env
DB_TYPE=postgres
DB_HOST=your-postgres-host
DB_NAME=joshburt_website
DB_USER=joshburt_user
DB_PASSWORD=secure_password
DB_SSL=true
```

3. **Run database initialization**:
```bash
node test-mysql-init.js
```

4. **Migrate existing data** (if needed):
```bash
# Export from SQLite
sqlite3 database.sqlite .dump > export.sql

# Import to PostgreSQL (with manual conversion)
psql -h your-host -U joshburt_user -d joshburt_website < converted_export.sql
```

## Troubleshooting

### Common Issues

1. **"secretOrPrivateKey must have a value"**
   - Ensure `JWT_SECRET` is set in environment variables

2. **Database connection failed**
   - Check PostgreSQL server is running
   - Verify connection parameters
   - Check firewall/network connectivity

3. **Permission denied for relation**
   - Ensure database user has proper permissions
   - Run `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO username;`

4. **SQLite database locked**
   - Ensure only one connection at a time
   - Check file permissions
   - Restart application if needed

### Performance Optimization

1. **Database Indexes**: Already created for frequently queried columns
2. **Connection Pooling**: Enabled for PostgreSQL (max 20 connections)
3. **Query Optimization**: Use parameterized queries for better performance
4. **Connection Timeouts**: Configured for optimal performance

## Testing

### Running Tests

```bash
# Run all tests
npm test


# Run authentication tests only
npm test tests/auth.test.js

# Run with specific database
DB_TYPE=sqlite npm test
DB_TYPE=postgres npm test  # Requires PostgreSQL server
```

### Test Database

Tests automatically use a separate test database (`test_database.sqlite`) to avoid affecting development data. No debug logic or dead code is present in test files.

## Monitoring and Maintenance

### Health Check
- **Endpoint**: `GET /api/health`
- **Response**: Server status, timestamp, and environment
- **No debug or non-production output in health endpoint**

### Database Maintenance
- **Cleanup expired tokens**: Automatic during logout operations
- **Audit log rotation**: Implement based on retention requirements
- **Backup procedures**: Set up regular database backups for production

### Monitoring Queries
```sql
-- Check active users
SELECT COUNT(*) FROM users WHERE is_active = true;

-- Check recent registrations
SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days';

-- Check token usage
SELECT COUNT(*) FROM refresh_tokens WHERE expires_at > NOW();
```

## Production Deployment Checklist

- [ ] PostgreSQL database set up and accessible
- [ ] Environment variables configured correctly
- [ ] JWT_SECRET set to secure random value
- [ ] Default passwords changed
- [ ] SSL/TLS enabled for database connection
- [ ] Rate limiting configured appropriately
- [ ] Backup procedures in place
- [ ] Monitoring and alerting configured
- [ ] Audit log retention policy defined
- [ ] Security headers configured in production