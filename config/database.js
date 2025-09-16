const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Database configuration - support PostgreSQL, MySQL, and SQLite fallback
const DB_TYPE = process.env.DB_TYPE || 'mysql';

// PostgreSQL configuration
const pgConfig = {
  user: process.env.DB_USER || 'neondb_owner',
  host: process.env.DB_HOST || 'ep-broad-term-a75jcieo-pooler.ap-southeast-2.aws.neon.tech',
  database: process.env.DB_NAME || 'neondb',
  password: process.env.DB_PASSWORD || 'npg_RCwEhZ2pm6vx',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// MySQL configuration
const mysqlConfig = {
  host: process.env.DB_HOST || 'sql109.infinityfree.com',
  user: process.env.DB_USER || 'if0_38625972',
  password: process.env.DB_PASSWORD || 'MmN1ztIkTGRG',
  database: process.env.DB_NAME || 'if0_38625972_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// SQLite fallback for development
let sqlite3;
const path = require('path');
try {
  sqlite3 = require('sqlite3').verbose();
} catch (err) {
  console.log('SQLite3 not available, using PostgreSQL only');
}

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

class Database {
  constructor() {
    this.pool = null; // PostgreSQL
    this.db = null;   // SQLite
    this.mysqlPool = null; // MySQL
    this.type = DB_TYPE;
  }

  async connect() {
    try {
      if (this.type === 'mysql') {
        this.mysqlPool = await mysql.createPool(mysqlConfig);
        // Test connection
        const conn = await this.mysqlPool.getConnection();
        await conn.query('SELECT 1');
        conn.release();
        console.log('🐬 Connected to MySQL database');
      } else if (this.type === 'postgres' || this.type === 'postgresql') {
        this.pool = new Pool(pgConfig);
        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('📚 Connected to PostgreSQL database');
      } else {
        // Fallback to SQLite for development
        if (!sqlite3) {
          throw new Error('SQLite3 not available and PostgreSQL/MySQL not configured');
        }
        return new Promise((resolve, reject) => {
          this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
              console.error('Error connecting to SQLite database:', err);
              reject(err);
            } else {
              console.log('📚 Connected to SQLite database (fallback mode)');
              resolve();
            }
          });
        });
      }
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        console.log('📚 PostgreSQL database connection closed');
      } else if (this.db) {
        return new Promise((resolve, reject) => {
          this.db.close((err) => {
            if (err) {
              reject(err);
            } else {
              console.log('📚 SQLite database connection closed');
              resolve();
            }
          });
        });
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  // Utility to convert SQL with placeholders to the correct format
  _prepareQuery(sql, params = []) {
    if (this.mysqlPool) {
      // MySQL uses ?
      return { sql, params };
    } else if (this.pool) {
      // PostgreSQL uses $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
      return { sql: pgSql, params };
    } else {
      // SQLite uses ?
      return { sql, params };
    }
  }

  async run(sql, params = []) {
    const { sql: preparedSql, params: preparedParams } = this._prepareQuery(sql, params);
    if (this.mysqlPool) {
      // MySQL
      const [result] = await this.mysqlPool.execute(preparedSql, preparedParams);
      return {
        id: result.insertId || null,
        changes: result.affectedRows || 0,
        rows: result
      };
    } else if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        const result = await client.query(preparedSql, preparedParams);
        client.release();
        return { 
          id: result.rows[0]?.id || null, 
          changes: result.rowCount || 0,
          rows: result.rows
        };
      } catch (error) {
        client.release();
        throw error;
      }
    } else if (this.db) {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.run(preparedSql, preparedParams, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, changes: this.changes });
          }
        });
      });
    } else {
      throw new Error('Database not connected');
    }
  }

  async get(sql, params = []) {
    const { sql: preparedSql, params: preparedParams } = this._prepareQuery(sql, params);
    if (this.mysqlPool) {
      // MySQL
      const [rows] = await this.mysqlPool.execute(preparedSql, preparedParams);
      return rows[0] || null;
    } else if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        const result = await client.query(preparedSql, preparedParams);
        client.release();
        return result.rows[0] || null;
      } catch (error) {
        client.release();
        throw error;
      }
    } else if (this.db) {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.get(preparedSql, preparedParams, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    } else {
      throw new Error('Database not connected');
    }
  }

  async all(sql, params = []) {
    const { sql: preparedSql, params: preparedParams } = this._prepareQuery(sql, params);
    if (this.mysqlPool) {
      // MySQL
      const [rows] = await this.mysqlPool.execute(preparedSql, preparedParams);
      return rows;
    } else if (this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        const result = await client.query(preparedSql, preparedParams);
        client.release();
        return result.rows;
      } catch (error) {
        client.release();
        throw error;
      }
    } else if (this.db) {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.all(preparedSql, preparedParams, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    } else {
      throw new Error('Database not connected');
    }
  }
}

// MySQL table creation
async function createMySQLTables() {
  // Create users table for MySQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      oauth_provider VARCHAR(50),
      oauth_id VARCHAR(255),
      avatar_url TEXT,
      reset_token VARCHAR(255),
      reset_token_expires BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Create refresh tokens table for MySQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create audit log table for MySQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create indexes for better performance
  await database.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`);
}

const database = new Database();

async function initializeDatabase() {
  try {
    await database.connect();
    if (database.type === 'mysql') {
      await createMySQLTables();
    } else if (database.type === 'postgres' || database.type === 'postgresql') {
      await createPostgreSQLTables();
    } else {
      await createSQLiteTables();
    }
    await createDefaultUsers();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function createPostgreSQLTables() {
  // Create users table for PostgreSQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user' CHECK(role IN ('user', 'manager', 'admin')),
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      oauth_provider VARCHAR(50),
      oauth_id VARCHAR(255),
      avatar_url TEXT,
      reset_token VARCHAR(255),
      reset_token_expires BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create refresh tokens table for PostgreSQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create audit log table for PostgreSQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  await database.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`);
}

async function createSQLiteTables() {
  // Create users table for SQLite
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

  // Create refresh tokens table for SQLite
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

  // Create audit log table for SQLite
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
}

async function createDefaultUsers() {
  // Create default admin user if it doesn't exist
  const existingAdmin = await database.get('SELECT id FROM users WHERE email = ?', ['admin@joshburt.com.au']);
  
  if (!existingAdmin) {
    const adminPassword = await bcrypt.hash('admin123!', parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    await database.run(`
      INSERT INTO users (email, name, password_hash, role, email_verified)
      VALUES (?, ?, ?, ?, ?)
    `, ['admin@joshburt.com.au', 'Admin User', adminPassword, 'admin', true]);
    
    console.log('👑 Default admin user created: admin@joshburt.com.au / admin123!');
  }

  // Create test users
  const testUser = await database.get('SELECT id FROM users WHERE email = ?', ['test@example.com']);
  if (!testUser) {
    const testPassword = await bcrypt.hash('password', parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    await database.run(`
      INSERT INTO users (email, name, password_hash, role, email_verified)
      VALUES (?, ?, ?, ?, ?)
    `, ['test@example.com', 'Test User', testPassword, 'user', true]);
    
    console.log('👤 Test user created: test@example.com / password');
  }

  const managerUser = await database.get('SELECT id FROM users WHERE email = ?', ['manager@example.com']);
  if (!managerUser) {
    const managerPassword = await bcrypt.hash('manager123', parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    await database.run(`
      INSERT INTO users (email, name, password_hash, role, email_verified)
      VALUES (?, ?, ?, ?, ?)
    `, ['manager@example.com', 'Manager User', managerPassword, 'manager', true]);
    
    console.log('👔 Manager user created: manager@example.com / manager123');
  }
}

module.exports = {
  database,
  initializeDatabase
};