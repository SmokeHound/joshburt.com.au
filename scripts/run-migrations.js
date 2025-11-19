#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs all pending migrations in the migrations/ directory
 *
 * Usage:
 *   node scripts/run-migrations.js           # Run all pending migrations
 *   node scripts/run-migrations.js --dry-run # Show pending migrations without running
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initializeDatabase, database } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

/**
 * Get all migration files sorted by filename
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('⚠️  Migrations directory not found');
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files;
}

/**
 * Create migrations tracking table
 */
async function createMigrationsTable() {
  await database.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations() {
  const rows = await database.all(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  );
  return rows.map(r => r.filename);
}

/**
 * Apply a single migration
 */
async function applyMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  console.log(`📦 Applying migration: ${filename}`);

  // Execute migration in a transaction
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');

    // Execute migration SQL
    await client.query(sql);

    // Record migration as applied
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );

    await client.query('COMMIT');
    console.log(`✅ Applied: ${filename}`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to apply ${filename}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Main migration runner
 */
async function runMigrations(dryRun = false) {
  try {
    console.log('🚀 Database Migration Runner\n');

    // Initialize database connection
    await initializeDatabase();

    // Create migrations table
    await createMigrationsTable();

    // Get migration files
    const allMigrations = getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations();

    // Find pending migrations
    const pendingMigrations = allMigrations.filter(
      m => !appliedMigrations.includes(m)
    );

    console.log('📊 Migration Status:');
    console.log(`   Total migrations: ${allMigrations.length}`);
    console.log(`   Applied: ${appliedMigrations.length}`);
    console.log(`   Pending: ${pendingMigrations.length}\n`);

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    // Show pending migrations
    console.log('📋 Pending migrations:');
    pendingMigrations.forEach(m => console.log(`   - ${m}`));
    console.log('');

    if (dryRun) {
      console.log('🏁 Dry run complete (no changes made)');
      return;
    }

    // Apply pending migrations
    console.log('🔨 Applying migrations...\n');
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }

    console.log('\n✅ All migrations applied successfully');

  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  runMigrations(dryRun);
}

module.exports = { runMigrations, getMigrationFiles, getAppliedMigrations };
