// Dedicated script to test MySQL migration and database initialization
const { initializeDatabase } = require('./config/database');

(async () => {
  try {
    await initializeDatabase();
    console.log('✅ MySQL database initialized successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ MySQL database initialization failed:', err);
    process.exit(1);
  }
})();
