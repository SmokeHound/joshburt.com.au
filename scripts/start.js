#!/usr/bin/env node

/**
 * Production startup script for joshburt.com.au
 * Handles database initialization and server startup
 */

const { initializeDatabase } = require('../config/database');
const app = require('../server');

async function startServer() {
  try {
    console.log('🚀 Starting joshburt.com.au application...');
    
    // Initialize database first
    console.log('📚 Initializing database...');
    await initializeDatabase();
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📱 Frontend: ${process.env.FRONTEND_URL || `http://localhost:${PORT}`}`);
      console.log(`🔒 API: http://localhost:${PORT}/api`);
      
      if (process.env.DB_TYPE === 'postgres' || process.env.DB_TYPE === 'postgresql') {
        console.log('🐘 Using PostgreSQL database');
      } else {
        console.log('📁 Using SQLite database (development mode)');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only start if this script is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };