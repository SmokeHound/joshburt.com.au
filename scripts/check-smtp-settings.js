// Check SMTP settings in database using shared database wrapper
require('dotenv').config();
const { database } = require('../config/database');

async function checkSMTPSettings() {
  try {
    await database.connect();

    // Check SMTP settings
    const res = await database.all(
      'SELECT key, value, is_sensitive FROM settings WHERE key LIKE ? ORDER BY key',
      ['smtp%']
    );

    console.log('SMTP Settings in Database:');
    console.log('===========================');

    if (!res || res.length === 0) {
      console.log('No SMTP settings found!');
    } else {
      res.forEach(r => {
        const displayValue = r.is_sensitive ? '***REDACTED***' : r.value || '(null)';
        console.log(`  ${r.key} = ${displayValue}`);
      });
    }

    console.log('\n');

    // Check feature flags
    const ffRes = await database.all(
      'SELECT key, value, data_type FROM settings WHERE key = ?',[ 'featureFlags' ]
    );

    console.log('Feature Flags Setting:');
    console.log('======================');

    if (!ffRes || ffRes.length === 0) {
      console.log('No featureFlags setting found!');
    } else {
      ffRes.forEach(r => {
        console.log(`  ${r.key} (${r.data_type}) = ${r.value || '(null)'}`);
        if (r.value) {
          try {
            const parsed = JSON.parse(r.value);
            console.log('  Parsed JSON:', JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log('  (Failed to parse JSON)');
          }
        }
      });
    }

    await database.close();
  } catch (e) {
    console.error('Error:', e.message);
    try {
      await database.close();
    } catch (_) {}
    process.exit(1);
  }
}

checkSMTPSettings();
