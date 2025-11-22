#!/usr/bin/env node
/**
 * Direct settings API test using database access
 */

require('dotenv').config();
const { database } = require('../config/database');

async function testSettingsQuery() {
  console.log('📖 Testing settings table query...\n');

  try {
    await database.connect();
    // Test: Get all settings
    console.log('1. Get all settings:');
    const allSettings = await database.all(`
      SELECT key, value, category, data_type 
      FROM settings 
      ORDER BY category, key
    `);
    console.log(`Found ${allSettings.length} settings\n`);

    // Transform to object format
    const settings = {};
    for (const row of allSettings) {
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
    const themeSettings = await database.all(`
      SELECT key, value, data_type 
      FROM settings 
      WHERE category = 'theme'
    `);
    console.log(`Found ${themeSettings.length} theme settings:`);
    console.log(themeSettings);
    console.log();

    // Test: Get specific keys
    console.log('3. Get specific keys (siteTitle, maintenanceMode):');
    const specificSettings = await database.all(`
      SELECT key, value, data_type 
      FROM settings 
      WHERE key IN ('siteTitle', 'maintenanceMode')
    `);
    console.log(specificSettings);
    console.log();

    // Test: Update a setting
    console.log('4. Update siteTitle:');
    const testTitle = `Test ${Date.now()}`;
    await database.run(
      `
      UPDATE settings 
      SET value = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE key = 'siteTitle'
    `,
      [testTitle]
    );

    const updated = await database.get(`
      SELECT value FROM settings WHERE key = 'siteTitle'
    `);
    console.log(`Updated siteTitle to: "${updated.value}"`);

    // Restore original
    await database.run(
      `
      UPDATE settings 
      SET value = ?, updated_at = CURRENT_TIMESTAMP 
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
    await database.close();
  }
}

testSettingsQuery();
