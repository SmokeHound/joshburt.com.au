# Database Documentation

Complete guide to the PostgreSQL database schema and operations for joshburt.com.au.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Schema](#schema)
- [Common Queries](#common-queries)
- [Maintenance](#maintenance)
- [Backup & Recovery](#backup--recovery)

---

## Overview

### Database Platform

- **Type**: PostgreSQL 14+
- **Provider**: Neon (serverless PostgreSQL)
- **Connection**: Connection pooling via `config/database.js`
- **Schema Management**: Single master schema file (`database-schema.sql`)

### Key Features

- **Connection Pooling**: Automatic connection management
- **Full-Text Search**: PostgreSQL GIN indexes for products and filters
- **Audit Trail**: Comprehensive logging in `audit_logs` table
- **JSONB Storage**: Flexible settings and metadata storage

---

## Configuration

### Environment Variables

```env
# PostgreSQL Connection (required)
DB_HOST=your-db-host.neon.tech
DB_PORT=5432
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=your-database
DB_SSL=true

# Optional: Full connection string (alternative to individual vars)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

### Connection Pool

Configured in `config/database.js`:

```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,              // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});
```

---

## Schema

### Core Tables

#### users

User accounts with authentication and role-based access.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'mechanic',
  avatar_url VARCHAR(500),
  totp_secret VARCHAR(255),
  totp_enabled BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Roles**: `mechanic`, `manager`, `admin`

---

#### products

Oil products catalog with categories and variants.

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50),
  viscosity VARCHAR(50),
  specification VARCHAR(100),
  category_id INTEGER REFERENCES product_categories(id),
  stock_quantity INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search index
CREATE INDEX idx_products_search ON products 
  USING GIN(to_tsvector('english', name || ' ' || code));

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_type ON products(type);
```

---

#### product_categories

Hierarchical product categories (supports parent/child relationships).

```sql
CREATE TABLE product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_categories_parent ON product_categories(parent_id);
```

---

#### product_variants

Product variants (size, color, SKU variations).

```sql
CREATE TABLE product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) UNIQUE NOT NULL,
  size VARCHAR(50),
  color VARCHAR(50),
  stock_quantity INTEGER DEFAULT 0,
  price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
```

---

#### product_images

Multiple images per product (URLs, captions, display order).

```sql
CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
```

---

#### consumables

Workshop consumables (rags, gloves, cleaners, etc.).

```sql
CREATE TABLE consumables (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50),
  category VARCHAR(50),
  soh INTEGER DEFAULT 0,           -- Stock on hand
  reorder_point INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consumables_category ON consumables(category);
```

---

#### filters

Filter/parts catalog (oil filters, air filters, etc.).

```sql
CREATE TABLE filters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50),
  stock_quantity INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search index
CREATE INDEX idx_filters_search ON filters 
  USING GIN(to_tsvector('english', name || ' ' || code));
```

---

#### orders

Order headers with status tracking.

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'normal',
  tracking_number VARCHAR(100),
  estimated_delivery DATE,
  status_updated_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
```

**Status values**: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`

---

#### order_items

Order line items (products/consumables/filters).

```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

---

#### order_status_history

Audit trail for order status changes.

```sql
CREATE TABLE order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created ON order_status_history(created_at DESC);
```

---

#### inventory

Stock tracking across all item types.

```sql
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  item_type VARCHAR(50) NOT NULL,  -- 'product', 'consumable', 'filter'
  item_id INTEGER NOT NULL,
  stock_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_type, item_id)
);

CREATE INDEX idx_inventory_item ON inventory(item_type, item_id);
```

---

#### settings

Site-wide settings stored as JSONB.

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO settings (id, data) VALUES (1, '{}') ON CONFLICT DO NOTHING;
```

**Example settings data**:
```json
{
  "siteTitle": "Josh Burt Workshop",
  "theme": "dark",
  "primaryColor": "#3b82f6",
  "maintenanceMode": false,
  "enableRegistration": true,
  "featureFlags": {
    "betaFeatures": false
  }
}
```

---

#### audit_logs

System audit trail for compliance.

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

**Common actions**: `user:create`, `user:update`, `user:delete`, `product:create`, `order:create`, `settings:update`

---

#### notifications

User notifications system.

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

---

#### notification_preferences

User notification preferences.

```sql
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE,
  order_updates BOOLEAN DEFAULT TRUE,
  system_updates BOOLEAN DEFAULT TRUE,
  marketing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default preferences on user creation
INSERT INTO notification_preferences (user_id, email_enabled, order_updates)
SELECT id, TRUE, TRUE FROM users WHERE id NOT IN (SELECT user_id FROM notification_preferences);
```

---

#### refresh_tokens

JWT refresh token storage (hashed).

```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

**Cleanup**: Expired tokens pruned via `scripts/prune-refresh-tokens.js`

---

#### login_attempts

Rate limiting for failed logins.

```sql
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email, attempt_time);
```

---

```

---

## Common Queries

---

## Migrations

### Running Migrations

```bash
# Dry run (show pending migrations)
node scripts/run-migrations.js --dry-run

# Apply all pending migrations
node scripts/run-migrations.js

# Manual migration
npm run migrate
```

### Migration Files

Located in `migrations/` directory:

| File | Description |
|------|-------------|
| `001_add_product_categories.sql` | Product categories, variants, images |
| `002_add_order_status_tracking.sql` | Order tracking columns and history table |
| `003_add_notification_system.sql` | Notifications and preferences |
| `004_add_filters.sql` | Filters/parts catalog table |
| `004_add_last_login.sql` | Last login tracking for users |

### Creating New Migration

1. Create file: `migrations/005_add_my_feature.sql`
2. Write SQL (idempotent CREATE IF NOT EXISTS recommended)
3. Run migration: `npm run migrate`
4. Update `database-schema.sql` to match

---

## Common Queries

### User Management

```sql
-- Get all users with role counts
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;

-- Find users who haven't logged in for 30 days
SELECT id, email, name, last_login
FROM users
WHERE last_login < NOW() - INTERVAL '30 days'
OR last_login IS NULL;
```

### Product Queries

```sql
-- Low stock products
SELECT name, code, stock_quantity, reorder_point
FROM products
WHERE stock_quantity < reorder_point
AND is_active = TRUE
ORDER BY stock_quantity ASC;

-- Full-text search
SELECT name, code, type
FROM products
WHERE to_tsvector('english', name || ' ' || code) @@ to_tsquery('synthetic & oil')
LIMIT 20;

-- Products by category with hierarchy
SELECT 
  p.name as product_name,
  c1.name as category,
  c2.name as parent_category
FROM products p
LEFT JOIN product_categories c1 ON p.category_id = c1.id
LEFT JOIN product_categories c2 ON c1.parent_id = c2.id
WHERE p.is_active = TRUE;
```

### Order Analytics

```sql
-- Orders by status
SELECT status, COUNT(*) as count, SUM(oi.quantity * oi.price_per_unit) as total_value
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
GROUP BY status;

-- Top products by order volume
SELECT 
  p.name,
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.quantity) as total_quantity
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE oi.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.name
ORDER BY total_quantity DESC
LIMIT 10;

-- Order status history for order
SELECT 
  old_status,
  new_status,
  u.name as changed_by,
  notes,
  osh.created_at
FROM order_status_history osh
LEFT JOIN users u ON osh.changed_by = u.id
WHERE order_id = 123
ORDER BY osh.created_at DESC;
```

### Audit Trail

```sql
-- Recent admin actions
SELECT 
  u.name as user,
  al.action,
  al.details,
  al.created_at
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE u.role = 'admin'
AND al.created_at > NOW() - INTERVAL '7 days'
ORDER BY al.created_at DESC;

-- Actions by user
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE user_id = 1
GROUP BY action
ORDER BY count DESC;
```

---

## Maintenance

### Index Maintenance

```sql
-- Rebuild all indexes
REINDEX DATABASE joshburt_website;

-- Vacuum tables (reclaim space)
VACUUM ANALYZE users;
VACUUM ANALYZE products;
VACUUM ANALYZE orders;
```

### Cleanup Tasks

```bash
# Prune expired refresh tokens
node scripts/prune-refresh-tokens.js

# Clean up old login attempts (30+ days)
DELETE FROM login_attempts WHERE attempt_time < NOW() - INTERVAL '30 days';

# Archive old audit logs (1+ year)
INSERT INTO audit_logs_archive SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## Backup & Recovery

### Automatic Backups

Neon provides automatic daily backups with point-in-time recovery (last 7 days).

### Manual Backup

```bash
# Full database dump
pg_dump -h your-db-host.neon.tech \
  -U your-username \
  -d your-database \
  -F c \
  -f backup-$(date +%Y%m%d).dump

# Schema only
pg_dump --schema-only -h your-db-host.neon.tech -U your-username -d your-database -f schema.sql
```

### Restore

```bash
# Restore from dump
pg_restore -h your-db-host.neon.tech \
  -U your-username \
  -d your-database \
  -v backup-20251111.dump

# Restore schema only
psql -h your-db-host.neon.tech -U your-username -d your-database -f database-schema.sql
```

---

## Database Health

### Health Check

```bash
# Via function endpoint
npm run health

# Or manually
curl http://localhost:8888/.netlify/functions/health
```

### Performance Monitoring

```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Slow queries (>1 second)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

---

## Indexes

### Current Indexes

| Table | Index Name | Columns | Type |
|-------|------------|---------|------|
| users | idx_users_email | email | B-tree |
| users | idx_users_role | role | B-tree |
| products | idx_products_search | name, code | GIN (full-text) |
| products | idx_products_category | category_id | B-tree |
| orders | idx_orders_status | status | B-tree |
| orders | idx_orders_created | created_at DESC | B-tree |
| audit_logs | idx_audit_logs_created | created_at DESC | B-tree |
| notifications | idx_notifications_unread | user_id, is_read | Partial (WHERE is_read = FALSE) |

---

## Support

- **Schema File**: `database-schema.sql` (master schema)
- **Migration Runner**: `scripts/run-migrations.js`
- **Health Check**: `scripts/health-check.js`

---

**Last Updated**: 2025-11-11  
**Maintained By**: Development Team
