#!/usr/bin/env node
/**
 * Apply Email Verification Tracking Migration
 * Runs the migration to add email_verification_attempts table
 */

require('dotenv').config();
const { database } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  console.log('🔄 Applying email verification tracking migration...\n');

  try {
    // Connect to database
    await database.connect();
    console.log('✅ Database connected\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/005_add_email_verification_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Executing migration SQL...\n');
    
    // Use the pool directly to avoid double-release issues
    const client = await database.pool.connect();
    try {
      await client.query(migrationSQL);
      console.log('✅ Migration applied successfully!\n');
    } finally {
      client.release();
    }

    // Verify table was created
    console.log('🔍 Verifying table creation...\n');
    const tableCheck = await database.get(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'email_verification_attempts'
      ) as exists`
    );

    if (tableCheck && tableCheck.exists) {
      console.log('✅ email_verification_attempts table verified\n');
      
      // Show table structure
      const columns = await database.all(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns 
         WHERE table_name = 'email_verification_attempts'
         ORDER BY ordinal_position`
      );
      
      console.log('📊 Table structure:');
      console.log('-------------------');
      columns.forEach(col => {
        console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(25)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      console.log('');

      // Show indexes
      const indexes = await database.all(
        `SELECT indexname 
         FROM pg_indexes 
         WHERE tablename = 'email_verification_attempts'`
      );
      
      console.log('📊 Indexes created:');
      console.log('-------------------');
      indexes.forEach(idx => {
        console.log(`  ✓ ${idx.indexname}`);
      });
      console.log('');

      console.log('🎉 Migration complete! Email verification tracking is now active.\n');
    } else {
      console.error('❌ Table verification failed!');
      process.exit(1);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration();
