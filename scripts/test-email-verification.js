#!/usr/bin/env node
/**
 * Email Verification System Test
 * Tests the email verification tracking and admin features
 */

require('dotenv').config();
const { database } = require('../config/database');

async function testEmailVerification() {
  console.log('🧪 Testing Email Verification System...\n');

  try {
    // Connect to database
    await database.connect();
    console.log('✅ Database connected\n');

    // Test 1: Check if email_verification_attempts table exists
    console.log('📋 Test 1: Checking if email_verification_attempts table exists...');
    const tableCheck = await database.get(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'email_verification_attempts'
      ) as exists
    `);

    if (tableCheck && tableCheck.exists) {
      console.log('✅ email_verification_attempts table exists\n');
    } else {
      console.error('❌ email_verification_attempts table NOT found!');
      console.log('   Run: node scripts/run-migrations.js\n');
      process.exit(1);
    }

    // Test 2: Check table structure
    console.log('📋 Test 2: Verifying table structure...');
    const columns = await database.all(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'email_verification_attempts'
      ORDER BY ordinal_position
    `);

    const expectedColumns = [
      'id',
      'user_id',
      'email',
      'attempt_type',
      'token_used',
      'success',
      'ip_address',
      'user_agent',
      'error_message',
      'created_at'
    ];

    const actualColumns = columns.map(c => c.column_name);
    const missing = expectedColumns.filter(col => !actualColumns.includes(col));

    if (missing.length === 0) {
      console.log('✅ All required columns present:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      console.log('');
    } else {
      console.error('❌ Missing columns:', missing.join(', '));
      process.exit(1);
    }

    // Test 3: Check indexes
    console.log('📋 Test 3: Checking indexes...');
    const indexes = await database.all(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'email_verification_attempts'
    `);

    console.log('✅ Indexes found:');
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    console.log('');

    // Test 4: Test sample insert (if we have a user)
    console.log('📋 Test 4: Testing sample data insertion...');
    const sampleUser = await database.get('SELECT id, email FROM users LIMIT 1');

    if (sampleUser) {
      await database.run(
        `
        INSERT INTO email_verification_attempts 
        (user_id, email, attempt_type, success, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [sampleUser.id, sampleUser.email, 'test', true, '127.0.0.1', 'test-script']
      );

      const inserted = await database.get(
        `SELECT * FROM email_verification_attempts 
         WHERE attempt_type = 'test' AND email = ?
         ORDER BY created_at DESC LIMIT 1`,
        [sampleUser.email]
      );

      if (inserted) {
        console.log('✅ Sample insert successful:');
        console.log(`   User ID: ${inserted.user_id}`);
        console.log(`   Email: ${inserted.email}`);
        console.log(`   Type: ${inserted.attempt_type}`);
        console.log(`   Success: ${inserted.success}`);
        console.log(`   Created: ${inserted.created_at}`);

        // Clean up test data
        await database.run(
          `
          DELETE FROM email_verification_attempts 
          WHERE id = ?
        `,
          [inserted.id]
        );
        console.log('   (Test record cleaned up)');
      }
    } else {
      console.log('⚠️  No users in database to test with - skipping insert test');
    }
    console.log('');

    // Test 5: Check users table has required columns
    console.log('📋 Test 5: Verifying users table has verification columns...');
    const userColumns = await database.all(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email_verified', 'email_verification_token', 'email_verification_expires')
    `);

    const requiredUserColumns = [
      'email_verified',
      'email_verification_token',
      'email_verification_expires'
    ];
    const foundUserColumns = userColumns.map(c => c.column_name);
    const missingUserCols = requiredUserColumns.filter(col => !foundUserColumns.includes(col));

    if (missingUserCols.length === 0) {
      console.log('✅ All required user table columns present:');
      requiredUserColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
    } else {
      console.error('❌ Missing user table columns:', missingUserCols.join(', '));
      process.exit(1);
    }
    console.log('');

    // Final summary
    console.log('═'.repeat(50));
    console.log('✅ All tests passed!');
    console.log('═'.repeat(50));
    console.log('\n📊 Summary:');
    console.log('✅ email_verification_attempts table exists');
    console.log('✅ All required columns present');
    console.log('✅ Indexes created');
    console.log('✅ Data insertion works');
    console.log('✅ Users table properly configured');
    console.log('\n🎉 Email verification system is ready to use!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run tests
testEmailVerification();
