#!/usr/bin/env node
/**
 * Run Settings Table Migration
 * Upgrades the settings table from single-row JSON to key-value structure
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { database } = require('../config/database');

async function runMigration() {
  await database.connect();
  const client = await database.pool.connect();

  try {
    console.log('🔄 Starting settings table migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/006_upgrade_settings_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Begin transaction
    await client.query('BEGIN');

    console.log('📋 Checking current settings table structure...');
    const tableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      ORDER BY ordinal_position
    `);

    console.log(
      'Current columns:',
      tableCheck.rows.map(r => `${r.column_name} (${r.data_type})`).join(', ')
    );

    // Check if already migrated
    const hasKeyColumn = tableCheck.rows.some(r => r.column_name === 'key');
    if (hasKeyColumn) {
      console.log('\n✅ Settings table already upgraded!');
      await client.query('ROLLBACK');
      return;
    }

    console.log('\n🔨 Running migration...');

    // Execute migration
    await client.query(migrationSQL);

    // Verify migration
    const newTableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      ORDER BY ordinal_position
    `);

    console.log('\n✅ Migration completed successfully!');
    console.log(
      'New columns:',
      newTableCheck.rows.map(r => `${r.column_name} (${r.data_type})`).join(', ')
    );

    // Show migrated settings count
    const countResult = await client.query('SELECT COUNT(*) as count FROM settings');
    console.log(`\n📊 Migrated ${countResult.rows[0].count} settings`);

    // Show sample settings
    const sampleResult = await client.query(`
      SELECT key, category, data_type, LEFT(value, 50) as value_preview 
      FROM settings 
      ORDER BY category, key 
      LIMIT 10
    `);

    console.log('\n📋 Sample settings:');
    console.table(sampleResult.rows);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✨ Migration complete! The settings table has been upgraded.');
    console.log('\n⚠️  Note: The old settings table is preserved as "settings_legacy" for backup.');
    console.log('   A compatibility view "settings_json_view" is available for legacy access.\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await database.close();
  }
}

// Run migration
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
