#!/usr/bin/env node
/**
 * Database Migration Runner
 * Applies SQL migrations in order to the database
 */

const fs = require('fs');
const path = require('path');
const { database } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function runMigrations() {
  console.log('🔄 Starting database migrations...');

  try {
    // Connect to database
    await database.connect();
    console.log('✅ Connected to database');

    // Create migrations tracking table if it doesn't exist
    await database.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Schema migrations table ready');

    // Get list of already applied migrations
    const appliedMigrations = await database.all(
      'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
    );
    const appliedSet = new Set(appliedMigrations.map(m => m.migration_name));

    // Get all migration files
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensures migrations run in order

    console.log(`\n📋 Found ${migrationFiles.length} migration files`);
    console.log(`📋 Already applied: ${appliedSet.size} migrations\n`);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of migrationFiles) {
      const migrationName = file;

      if (appliedSet.has(migrationName)) {
        console.log(`⏭️  Skipping ${migrationName} (already applied)`);
        skippedCount++;
        continue;
      }

      console.log(`🔄 Applying migration: ${migrationName}`);

      try {
        // Read migration file
        const migrationPath = path.join(MIGRATIONS_DIR, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolons but keep statements together
        // This is a simple approach; for complex migrations, consider a proper SQL parser
        const statements = migrationSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        // Execute each statement
        for (const statement of statements) {
          if (statement.trim()) {
            await database.run(statement);
          }
        }

        // Record migration as applied
        await database.run(
          'INSERT INTO schema_migrations (migration_name) VALUES (?)',
          [migrationName]
        );

        console.log(`✅ Applied ${migrationName}`);
        appliedCount++;
      } catch (error) {
        console.error(`❌ Failed to apply ${migrationName}:`, error.message);
        console.error('Full error:', error);
        throw error; // Stop on first error
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`   - Applied: ${appliedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    console.log(`   - Total: ${migrationFiles.length}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection if needed
    if (database.close) {
      await database.close();
    }
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ All migrations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
