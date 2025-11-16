// Check SMTP settings in database
require('dotenv').config();
const { Pool } = require('pg');

// Use DATABASE_URL if available, otherwise individual params
const DATABASE_URL = process.env.DATABASE_URL || null;
const pgConfig = DATABASE_URL
  ? {
    connectionString: DATABASE_URL,
    ssl: true
  }
  : {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: true }
  };

const pool = new Pool(pgConfig);

async function checkSMTPSettings() {
  try {
    const res = await pool.query(
      "SELECT key, value, is_sensitive FROM settings WHERE key LIKE 'smtp%' ORDER BY key"
    );
    
    console.log('SMTP Settings in Database:');
    console.log('===========================');
    
    if (res.rows.length === 0) {
      console.log('No SMTP settings found!');
    } else {
      res.rows.forEach(r => {
        const displayValue = r.is_sensitive ? '***REDACTED***' : (r.value || '(null)');
        console.log(`  ${r.key} = ${displayValue}`);
      });
    }
    
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
    process.exit(1);
  }
}

checkSMTPSettings();
