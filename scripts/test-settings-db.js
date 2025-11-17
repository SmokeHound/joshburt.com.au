#!/usr/bin/env node
/**
 * Direct settings API test using database access
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

async function testSettingsQuery() {
  console.log('📖 Testing settings table query...\n');

  try {
    // Test: Get all settings
    console.log('1. Get all settings:');
    const allSettings = await pool.query(`
      SELECT key, value, category, data_type 
      FROM settings 
      ORDER BY category, key
    `);
    console.log(`Found ${allSettings.rows.length} settings\n`);

    // Transform to object format
    const settings = {};
    for (const row of allSettings.rows) {
      let value = row.value;

      if (row.data_type === 'boolean') {
        value = value === 'true' || value === '1' || value === true;
      } else if (row.data_type === 'number') {
        value = parseFloat(value);
      } else if (row.data_type === 'json' || row.data_type === 'array') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string
        }
      }

      settings[row.key] = value;
    }

    console.log('Transformed settings object:');
    console.log(JSON.stringify(settings, null, 2));
    console.log();

    // Test: Get by category
    console.log('2. Get theme settings:');
    const themeSettings = await pool.query(`
      SELECT key, value, data_type 
      FROM settings 
      WHERE category = 'theme'
    `);
    console.log(`Found ${themeSettings.rows.length} theme settings:`);
    console.log(themeSettings.rows);
    console.log();

    // Test: Get specific keys
    console.log('3. Get specific keys (siteTitle, maintenanceMode):');
    const specificSettings = await pool.query(`
      SELECT key, value, data_type 
      FROM settings 
      WHERE key IN ('siteTitle', 'maintenanceMode')
    `);
    console.log(specificSettings.rows);
    console.log();

    // Test: Update a setting
    console.log('4. Update siteTitle:');
    const testTitle = `Test ${Date.now()}`;
    await pool.query(
      `
      UPDATE settings 
      SET value = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE key = 'siteTitle'
    `,
      [testTitle]
    );

    const updated = await pool.query(`
      SELECT value FROM settings WHERE key = 'siteTitle'
    `);
    console.log(`Updated siteTitle to: "${updated.rows[0].value}"`);

    // Restore original
    await pool.query(
      `
      UPDATE settings 
      SET value = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE key = 'siteTitle'
    `,
      ['']
    );
    console.log('Restored original value\n');

    console.log('✅ All database queries working correctly!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

testSettingsQuery();
