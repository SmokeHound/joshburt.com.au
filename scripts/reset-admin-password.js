#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

async function resetAdminPassword() {
  try {
    const newHash = await bcrypt.hash('Admin123!', 12);
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = 'admin@joshburt.com.au' RETURNING email",
      [newHash]
    );
    console.log('✅ Password reset for:', result.rows[0].email);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
