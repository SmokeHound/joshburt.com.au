const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error connecting to database:', err);
          reject(err);
        } else {
          console.log('📚 Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('📚 Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

const database = new Database();

async function initializeDatabase() {
  try {
    await database.connect();
    
    // Create users table
    await database.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT,
        role TEXT DEFAULT 'user' CHECK(role IN ('user', 'manager', 'admin')),
        is_active BOOLEAN DEFAULT 1,
        email_verified BOOLEAN DEFAULT 0,
        oauth_provider TEXT,
        oauth_id TEXT,
        avatar_url TEXT,
        reset_token TEXT,
        reset_token_expires INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create refresh tokens table
    await database.run(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create audit log table
    await database.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // Create default admin user if it doesn't exist
    const existingAdmin = await database.get('SELECT id FROM users WHERE email = ?', ['admin@joshburt.com.au']);
    
    if (!existingAdmin) {
      const adminPassword = await bcrypt.hash('admin123!', parseInt(process.env.BCRYPT_ROUNDS) || 12);
      await database.run(`
        INSERT INTO users (email, name, password_hash, role, email_verified)
        VALUES (?, ?, ?, ?, ?)
      `, ['admin@joshburt.com.au', 'Admin User', adminPassword, 'admin', 1]);
      
      console.log('👑 Default admin user created: admin@joshburt.com.au / admin123!');
    }

    // Create test users
    const testUser = await database.get('SELECT id FROM users WHERE email = ?', ['test@example.com']);
    if (!testUser) {
      const testPassword = await bcrypt.hash('password', parseInt(process.env.BCRYPT_ROUNDS) || 12);
      await database.run(`
        INSERT INTO users (email, name, password_hash, role, email_verified)
        VALUES (?, ?, ?, ?, ?)
      `, ['test@example.com', 'Test User', testPassword, 'user', 1]);
      
      console.log('👤 Test user created: test@example.com / password');
    }

    const managerUser = await database.get('SELECT id FROM users WHERE email = ?', ['manager@example.com']);
    if (!managerUser) {
      const managerPassword = await bcrypt.hash('manager123', parseInt(process.env.BCRYPT_ROUNDS) || 12);
      await database.run(`
        INSERT INTO users (email, name, password_hash, role, email_verified)
        VALUES (?, ?, ?, ?, ?)
      `, ['manager@example.com', 'Manager User', managerPassword, 'manager', 1]);
      
      console.log('👔 Manager user created: manager@example.com / manager123');
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

module.exports = {
  database,
  initializeDatabase
};