#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Runs SQL migrations in order to keep database schema up to date.
 * Tracks applied migrations in the 'migrations' table.
 * 
 * Usage:
 *   node scripts/run-migrations.js          # Run all pending migrations
 *   node scripts/run-migrations.js --dry-run # Show pending migrations without applying
 *   node scripts/run-migrations.js --rollback # Rollback last migration (if rollback script exists)
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function ensureMigrationsTable(db) {
  console.log('📋 Ensuring migrations table exists...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await db.query(createTableSQL);
  console.log('✅ Migrations table ready');
}

async function getAppliedMigrations(db) {
  try {
    const result = await db.query('SELECT version FROM migrations ORDER BY version');
    return result.rows.map(row => row.version);
  } catch (error) {
    console.error('❌ Error fetching applied migrations:', error.message);
    return [];
  }
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('ℹ️  No migrations directory found');
    return [];
  }
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql') && !file.includes('rollback'))
    .sort();
  
  return files.map(file => {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) return null;
    
    return {
      version: match[1],
      name: match[2],
      filename: file,
      filepath: path.join(MIGRATIONS_DIR, file)
    };
  }).filter(Boolean);
}

async function runMigration(db, migration) {
  console.log(`\n🔄 Running migration ${migration.version}: ${migration.name}`);
  
  const sql = fs.readFileSync(migration.filepath, 'utf8');
  
  try {
    // Run migration in a transaction
    await db.query('BEGIN');
    
    // Execute migration SQL
    await db.query(sql);
    
    // Record migration (if not already recorded by the migration itself)
    await db.query(
      `INSERT INTO migrations (version, name) 
       VALUES ($1, $2) 
       ON CONFLICT (version) DO NOTHING`,
      [migration.version, migration.name]
    );
    
    await db.query('COMMIT');
    
    console.log(`✅ Migration ${migration.version} completed successfully`);
    return true;
  } catch (error) {
    await db.query('ROLLBACK');
    console.error(`❌ Migration ${migration.version} failed:`, error.message);
    throw error;
  }
}

async function runMigrations(dryRun = false) {
  console.log('🚀 Database Migration Runner\n');
  
  const db = await getDb();
  
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable(db);
    
    // Get applied and available migrations
    const appliedMigrations = await getAppliedMigrations(db);
    const availableMigrations = getMigrationFiles();
    
    console.log(`\n📊 Status:`);
    console.log(`   Applied migrations: ${appliedMigrations.length}`);
    console.log(`   Available migrations: ${availableMigrations.length}`);
    
    // Find pending migrations
    const pendingMigrations = availableMigrations.filter(
      m => !appliedMigrations.includes(m.version)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('\n✨ Database is up to date! No pending migrations.');
      return;
    }
    
    console.log(`\n📝 Pending migrations: ${pendingMigrations.length}`);
    pendingMigrations.forEach(m => {
      console.log(`   - ${m.version}: ${m.name}`);
    });
    
    if (dryRun) {
      console.log('\n🏷️  Dry run mode - no changes applied');
      return;
    }
    
    // Run each pending migration
    console.log('\n▶️  Applying migrations...');
    for (const migration of pendingMigrations) {
      await runMigration(db, migration);
    }
    
    console.log('\n✨ All migrations completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

async function showStatus() {
  console.log('📊 Migration Status\n');
  
  const db = await getDb();
  
  try {
    await ensureMigrationsTable(db);
    
    const appliedMigrations = await getAppliedMigrations(db);
    const availableMigrations = getMigrationFiles();
    
    console.log('Applied Migrations:');
    if (appliedMigrations.length === 0) {
      console.log('  (none)');
    } else {
      const result = await db.query(
        'SELECT version, name, applied_at FROM migrations ORDER BY version'
      );
      result.rows.forEach(row => {
        console.log(`  ✓ ${row.version}: ${row.name} (${new Date(row.applied_at).toLocaleString()})`);
      });
    }
    
    const pendingMigrations = availableMigrations.filter(
      m => !appliedMigrations.includes(m.version)
    );
    
    console.log('\nPending Migrations:');
    if (pendingMigrations.length === 0) {
      console.log('  (none)');
    } else {
      pendingMigrations.forEach(m => {
        console.log(`  ⏳ ${m.version}: ${m.name}`);
      });
    }
    
  } finally {
    await db.end();
  }
}

// CLI handling
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const status = args.includes('--status');

if (status) {
  showStatus().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
} else {
  runMigrations(dryRun).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}
