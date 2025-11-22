#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { database } = require('../config/database');

async function resetAdminPassword() {
  try {
    await database.connect();
    const newHash = await bcrypt.hash('Admin123!', 12);
    const result = await database.run(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [newHash, 'admin@joshburt.com.au']
    );
    console.log('✅ Password reset for: admin@joshburt.com.au');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await database.close();
  }
}

resetAdminPassword();
