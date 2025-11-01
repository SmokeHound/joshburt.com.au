
# Database Implementation Guide (Production-Ready, Audited)

## Overview


The joshburt.com.au application supports two database backends:
- **PostgreSQL** (default, supported, e.g. Neon)
- **SQLite** (for development and testing)

## Database Configuration

### Environment Variables

Set the following environment variables based on your deployment:

 All dynamic operations are served via Netlify Functions at `/.netlify/functions/users`.

#### PostgreSQL (default, e.g. Neon)
```env
# Database Type
DB_TYPE=postgres

# PostgreSQL Configuration

DB_HOST='ep-broad-term-a75jcieo-pooler.ap-southeast-2.aws.neon.tech'
DB_DATABASE='neondb'
DB_USER='neondb_owner'
DB_PASSWORD='*************'
DB_SSLMODE='require'
DB_CHANNELBINDING='require'

# JWT Configuration (required)
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_ROUNDS=12
DB_PASSWORD=your-secure-password
DB_SSL=true
```

#### SQLite (Development)
 Access audit logs via `/.netlify/functions/audit-logs`.
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

- siteTitle, siteDescription, logoUrl, faviconUrl, contactEmail, 
- theme, primaryColor, secondaryColor, accentColor, themeSchedule
- maintenanceMode, enableRegistration, enableGuestCheckout
- googleAnalyticsId, facebookPixelId, smtpHost, smtpPort, smtpUser, smtpPassword
- customCss, customJs
- featureFlags (betaFeatures, newDashboard, advancedReports)
- sessionTimeout, maxLoginAttempts, enable2FA, auditAllActions

All changes to settings are audit-logged for compliance and traceability.

### Users Table
```sql
-- PostgreSQL
CREATE TABLE IF NOT EXISTS users (
   id SERIAL PRIMARY KEY,
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
   details TEXT,
   ip_address VARCHAR(45),
```


| Role | Email | Password | Purpose |

> **Security Note**: Change default passwords immediately in production!

## Database Operations

### Connection Management


The database abstraction in `config/database.js` automatically handles connections and query parameter conversion for PostgreSQL and SQLite:

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
- **SQLite**: Uses `?` placeholders
- **PostgreSQL**: Converts to `$1, $2, $3...` placeholders

Example:
```javascript
// SQLite: SELECT * FROM users WHERE email = ? AND is_active = ?
// PostgreSQL: SELECT * FROM users WHERE email = $1 AND is_active = $2
```

## Serverless API Endpoints (Current)

All dynamic operations are served via Netlify Functions under `/.netlify/functions/*`.

### Authentication (Unified Function)

Single function `/.netlify/functions/auth` handles multiple actions via the `action` query parameter (or request body fallback for POST). Each action shares the same base path and differs only by `action` value.

| Action | Method | Endpoint Example | Description | Auth Required |
|--------|--------|------------------|-------------|---------------|
| register | POST | `/.netlify/functions/auth?action=register` | Register new user | No |
| login | POST | `/.netlify/functions/auth?action=login` | User login (issues access + refresh) | No |
| logout | POST | `/.netlify/functions/auth?action=logout` | Invalidate refresh token | Yes |
| refresh | POST | `/.netlify/functions/auth?action=refresh` | Exchange refresh for new tokens | No |
| me | GET | `/.netlify/functions/auth?action=me` | Get current user profile | Yes |
| forgot-password | POST | `/.netlify/functions/auth?action=forgot-password` | Initiate password reset (always 200) | No |
| reset-password | POST | `/.netlify/functions/auth?action=reset-password` | Reset password with valid token | No |
| verify-email | POST | `/.netlify/functions/auth?action=verify-email` | Email verification placeholder | Yes (token) |

### Users

User management is performed through the `users` function. ID-specific operations use a path suffix (e.g. `/.netlify/functions/users/123`) or query parameter fallback depending on implementation.

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/.netlify/functions/users` | List all users | Manager/Admin |
| GET | `/.netlify/functions/users/:id` | Get user by ID | Manager/Admin |
| POST | `/.netlify/functions/users` | Create new user | Admin |
| PUT | `/.netlify/functions/users/:id` | Update user | Admin (or own profile) |
| DELETE | `/.netlify/functions/users/:id` | Delete user | Admin |
| PUT | `/.netlify/functions/users/:id/password` | Change password | Admin (or own profile) |
| GET | `/.netlify/functions/users?stats=overview` | User statistics overview | Manager/Admin |

### Products

Product catalog management via `products` function. Supports filtering by query parameters (e.g. `type`, `category`).

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/.netlify/functions/products` | List products (optional filters) | No |
| GET | `/.netlify/functions/products/:id` | Get product by ID | No |
| POST | `/.netlify/functions/products` | Create new product | Admin |
| PUT | `/.netlify/functions/products/:id` | Update product | Admin |
| DELETE | `/.netlify/functions/products/:id` | Delete product | Admin |

### Inventory

Inventory adjustments and stock queries.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/.netlify/functions/inventory` | List inventory records / summary | Manager/Admin |
| POST | `/.netlify/functions/inventory` | Adjust inventory (delta, reason) | Manager/Admin |

### Consumables

Consumable items tracked separately from products (e.g., shop supplies).

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/.netlify/functions/consumables` | List consumables | Manager/Admin |
| GET | `/.netlify/functions/consumables/:id` | Get consumable by ID | Manager/Admin |
| POST | `/.netlify/functions/consumables` | Create consumable | Manager/Admin |
| PUT | `/.netlify/functions/consumables/:id` | Update consumable | Manager/Admin |
| DELETE | `/.netlify/functions/consumables/:id` | Delete consumable | Admin |

### Consumable Categories

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/.netlify/functions/consumable-categories` | List categories | Manager/Admin |
| POST | `/.netlify/functions/consumable-categories` | Create category | Manager/Admin |
| PUT | `/.netlify/functions/consumable-categories/:id` | Update category | Manager/Admin |
| DELETE | `/.netlify/functions/consumable-categories/:id` | Delete category | Admin |

### Audit Logs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/.netlify/functions/audit-logs` | List audit events (supports pagination & search) | Admin |
| POST | `/.netlify/functions/audit-logs` | Create custom audit entry | Admin |
| DELETE | `/.netlify/functions/audit-logs` | Clear all logs or logs older than N days | Admin |

#### Query Parameters (GET)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number (enables paginated response structure) |
| `pageSize` | number | 25 | Page size (1–200) |
| `limit` | number | 100 | Backward-compatible single array limit (used only if `page`/`pageSize` omitted) |
| `q` | string | — | Free-text search across `action`, `details`, `user_id` (SQL LIKE) |
| `action` | string | — | Filter by exact action value |
| `userId` | string | — | Filter by exact user ID/email stored with entry |
| `startDate` | ISO date/time | — | Only include events with `created_at >= startDate` |
| `endDate` | ISO date/time | — | Only include events with `created_at <= endDate` |
| `format` | `csv` | — | If `csv`, returns CSV export instead of JSON |

When `page` or `pageSize` is provided the JSON response is:
```json
{
   "data": [ { /* log */ }, ... ],
   "pagination": { "page": 1, "pageSize": 25, "total": 1234, "totalPages": 50 }
}
```
If neither is supplied the response is a simple JSON array of logs (respecting `limit`).

#### DELETE Semantics

| Query | Behavior |
|-------|----------|
| (none) | Deletes ALL audit log rows |
| `olderThanDays=30` | Deletes only rows with `created_at` earlier than now minus N days |

Response example:
```json
{ "message": "Old audit logs cleared", "olderThanDays": 30 }
```

#### Example Requests

```bash
# First page, 50 per page, search for "settings"
curl \
   '/.netlify/functions/audit-logs?page=1&pageSize=50&q=settings'

# Export filtered login events to CSV
curl '/.netlify/functions/audit-logs?action=user_login&format=csv' -o login-events.csv

# Delete logs older than 90 days
curl -X DELETE '/.netlify/functions/audit-logs?olderThanDays=90'

# Example (array) limited to 25 entries
curl '/.netlify/functions/audit-logs?limit=25'
```

### Settings

Settings are a single JSON document in the database; function exposes retrieval and update.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/.netlify/functions/settings` | Retrieve current settings JSON | Admin |
| PUT | `/.netlify/functions/settings` | Replace/merge settings JSON | Admin |

### Orders

Customer order creation and administrative management.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/.netlify/functions/orders` | List orders (may support filters) | Manager/Admin |
| GET | `/.netlify/functions/orders/:id` | Get order by ID | Manager/Admin (or owner if exposed) |
| POST | `/.netlify/functions/orders` | Create new order | User |
| PUT | `/.netlify/functions/orders/:id` | Update order (status, details) | Manager/Admin |
| DELETE | `/.netlify/functions/orders/:id` | Delete/cancel order | Admin |

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


### From SQLite to PostgreSQL

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

3. **Run database initialization**: application functions auto-create tables on first use.

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
- **Endpoint**: `GET /.netlify/functions/health`
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