# Database Migrations Guide

## Overview

This guide covers the database migration system for joshburt.com.au, ensuring safe and consistent schema changes across environments.

## Migration System

### Structure

```
migrations/
├── 001_initial_schema.sql       # Initial database setup
├── 002_add_feature_x.sql        # Example feature migration
├── 002_add_feature_x_rollback.sql  # Optional rollback script
└── README.md                    # This file
```

### Naming Convention

Migration files must follow this pattern:
```
{version}_{description}.sql
```

- **Version**: 3-digit number (001, 002, 003, etc.)
- **Description**: Snake_case description of changes
- **Extension**: Always `.sql`

Examples:
- `001_initial_schema.sql`
- `002_add_two_factor_auth.sql`
- `003_add_product_categories.sql`

### Migration Tracking

Migrations are tracked in the `migrations` table:

```sql
CREATE TABLE migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Running Migrations

### Using the Migration Runner

```bash
# Run all pending migrations
node scripts/run-migrations.js

# Dry run (show pending migrations without applying)
node scripts/run-migrations.js --dry-run

# Show migration status
node scripts/run-migrations.js --status
```

### Manual Migration

For emergency situations or special cases:

```bash
# Connect to database
psql "<database-connection-string>"

# Run migration manually
\i migrations/001_initial_schema.sql

# Verify
SELECT * FROM migrations ORDER BY version;
```

## Creating New Migrations

### Step 1: Create Migration File

Create a new file in the `migrations/` directory:

```bash
# Next available version number
touch migrations/002_add_inventory_alerts.sql
```

### Step 2: Write Migration SQL

```sql
-- Migration: Add Inventory Alerts
-- Version: 002
-- Description: Adds low stock alerting system
-- Date: 2025-01-15

-- Create alerts table
CREATE TABLE IF NOT EXISTS inventory_alerts (
    id SERIAL PRIMARY KEY,
    item_type VARCHAR(50) NOT NULL,
    item_id INTEGER NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    threshold INTEGER,
    current_quantity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_alerts_item ON inventory_alerts(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON inventory_alerts(is_active);

-- Add reorder_point to products if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10;

-- Record migration
INSERT INTO migrations (version, name) 
VALUES ('002', 'add_inventory_alerts')
ON CONFLICT (version) DO NOTHING;
```

### Step 3: Create Rollback Script (Optional)

```bash
touch migrations/002_add_inventory_alerts_rollback.sql
```

```sql
-- Rollback: Add Inventory Alerts
-- Version: 002

DROP TABLE IF EXISTS inventory_alerts;
ALTER TABLE products DROP COLUMN IF EXISTS reorder_point;

DELETE FROM migrations WHERE version = '002';
```

### Step 4: Test Migration

```bash
# Test on local database
export DB_TYPE=sqlite
node scripts/run-migrations.js --dry-run

# Apply to local
node scripts/run-migrations.js

# Test rollback (if applicable)
psql "<local-db>" -f migrations/002_add_inventory_alerts_rollback.sql
```

### Step 5: Deploy to Staging

```bash
# Set staging database
export NEON_DATABASE_URL="<staging-connection-string>"

# Run migration
node scripts/run-migrations.js
```

### Step 6: Deploy to Production

```bash
# Set production database
export NEON_DATABASE_URL="<production-connection-string>"

# Run migration
node scripts/run-migrations.js
```

## Best Practices

### DO ✅

1. **Always use transactions**: Migrations run in transactions automatically
2. **Use IF NOT EXISTS**: For idempotent migrations
3. **Add indexes**: For new columns that will be queried
4. **Document changes**: Include comments explaining the purpose
5. **Test locally first**: Always test on SQLite or local PostgreSQL
6. **Test on staging**: Deploy to staging before production
7. **Keep migrations small**: One logical change per migration
8. **Version control**: Commit migrations with application code
9. **Backup before major changes**: Always backup production data

### DON'T ❌

1. **Don't modify existing migrations**: Create new ones instead
2. **Don't delete data**: Create data migration scripts separately
3. **Don't skip versions**: Keep version numbers sequential
4. **Don't depend on data**: Migrations should work on empty databases
5. **Don't mix DDL and DML**: Keep schema and data changes separate
6. **Don't use production data in migrations**: Keep them generic

## Migration Patterns

### Adding a Column

```sql
-- Migration: Add column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add index if frequently queried
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Set default for existing rows
UPDATE users SET phone = '' WHERE phone IS NULL;
```

### Modifying a Column

```sql
-- Migration: Modify column type
-- For PostgreSQL, use ALTER COLUMN
ALTER TABLE products 
  ALTER COLUMN price TYPE DECIMAL(12, 2);

-- If data conversion needed, do it first
UPDATE products SET price = ROUND(price, 2);
```

### Adding a Table

```sql
-- Migration: Add new table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
```

### Removing a Column (Careful!)

```sql
-- Migration: Remove deprecated column
-- Step 1: Make column nullable (separate migration)
ALTER TABLE users ALTER COLUMN legacy_field DROP NOT NULL;

-- Step 2: Stop using in code (deploy app changes)

-- Step 3: Drop column (new migration after verification)
ALTER TABLE users DROP COLUMN IF EXISTS legacy_field;
```

### Renaming a Table

```sql
-- Migration: Rename table
ALTER TABLE old_table_name RENAME TO new_table_name;

-- Update foreign key constraints if needed
-- Update indexes if they reference table name
```

## Data Migrations

For data-heavy migrations, create separate scripts:

```bash
# migrations/data/
migrations/data/002_migrate_old_format.js
```

```javascript
// Example data migration
const { getDb } = require('../../config/database');

async function migrate() {
  const db = await getDb();
  
  try {
    console.log('Starting data migration...');
    
    // Fetch records in batches
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const result = await db.query(
        'SELECT id, old_format FROM table LIMIT $1 OFFSET $2',
        [batchSize, offset]
      );
      
      if (result.rows.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process batch
      for (const row of result.rows) {
        const newFormat = transformData(row.old_format);
        await db.query(
          'UPDATE table SET new_format = $1 WHERE id = $2',
          [newFormat, row.id]
        );
      }
      
      offset += batchSize;
      console.log(`Processed ${offset} records...`);
    }
    
    console.log('Data migration complete!');
  } finally {
    await db.end();
  }
}

function transformData(oldData) {
  // Transform logic here
  return newData;
}

migrate().catch(console.error);
```

## Troubleshooting

### Migration Fails Midway

```bash
# Check current state
node scripts/run-migrations.js --status

# Check database logs
# Look for the specific error

# If transaction rolled back, fix migration and re-run
node scripts/run-migrations.js
```

### Migration Applied But Not Recorded

```bash
# Manually record migration
psql "<connection-string>"

INSERT INTO migrations (version, name) 
VALUES ('002', 'migration_name');
```

### Need to Skip a Migration

```bash
# Not recommended, but if absolutely necessary:
psql "<connection-string>"

INSERT INTO migrations (version, name) 
VALUES ('003', 'skipped_migration')
ON CONFLICT (version) DO NOTHING;
```

### Rollback a Migration

```bash
# If rollback script exists
psql "<connection-string>" -f migrations/002_migration_rollback.sql

# Otherwise, manually reverse changes
psql "<connection-string>"
-- Manually undo migration changes
```

## CI/CD Integration

### GitHub Actions

Add to your workflow:

```yaml
- name: Run database migrations
  env:
    NEON_DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
  run: |
    echo "Running migrations..."
    node scripts/run-migrations.js --dry-run
    node scripts/run-migrations.js
```

### Pre-deployment Checks

```bash
#!/bin/bash
# scripts/pre-deploy-check.sh

echo "Checking pending migrations..."
node scripts/run-migrations.js --dry-run

if [ $? -ne 0 ]; then
  echo "❌ Pending migrations detected. Run migrations first!"
  exit 1
fi

echo "✅ No pending migrations"
```

## Migration Checklist

Before running migrations in production:

- [ ] Tested locally with SQLite
- [ ] Tested on staging PostgreSQL
- [ ] Verified with --dry-run
- [ ] Backed up production database
- [ ] Notified team of deployment window
- [ ] Documented any manual steps required
- [ ] Created rollback plan
- [ ] Scheduled during low-traffic period
- [ ] Prepared monitoring for issues

## Resources

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html)
- [Database Schema Versioning Best Practices](https://www.liquibase.org/get-started/best-practices)

## Support

For migration issues:
- Check migration logs
- Review database error messages
- Test migration on staging first
- Create GitHub issue if stuck
- Contact database admin for urgent issues
