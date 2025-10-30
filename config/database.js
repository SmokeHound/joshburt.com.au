const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Database configuration - support PostgreSQL and SQLite fallback
const DB_TYPE = process.env.DB_TYPE || 'postgres';

// PostgreSQL configuration (prefer single URL if provided)
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || null;
const pgConfig = DATABASE_URL
  ? {
    connectionString: DATABASE_URL,
    ssl: true,
    max: parseInt(process.env.DB_POOL_MAX) || 20,  // Increased for better concurrency
    min: parseInt(process.env.DB_POOL_MIN) || 2,   // Maintain minimum connections
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 3000,
    // Query timeout to prevent long-running queries
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 10000,
    // Enable statement timeout for PostgreSQL
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 10000,
  }
  : {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: true },
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 3000,
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 10000,
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 10000,
  };

// SQLite fallback for development
let sqlite3;
const path = require('path');
try {
  sqlite3 = require('sqlite3').verbose();
} catch (err) {
  console.log('SQLite3 not available, using PostgreSQL only');
}

// Prefer a writable temp path on serverless platforms
const DB_PATH = process.env.DB_PATH || (process.env.NETLIFY ? '/tmp/database.sqlite' : path.join(__dirname, '..', 'database.sqlite'));
// Allow disabling SQLite fallback (recommended for production)
const DISABLE_SQLITE_FALLBACK = String(
  process.env.DB_DISABLE_SQLITE_FALLBACK || (process.env.NETLIFY ? 'true' : 'false')
).toLowerCase() === 'true';

class Database {
  constructor() {
    this.pool = null; // PostgreSQL
    this.db = null;   // SQLite
    this.type = DB_TYPE;
  }

  async connect() {
    try {
      if (this.type === 'postgres' || this.type === 'postgresql') {
        this.pool = new Pool(pgConfig);
        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('📚 Connected to PostgreSQL database');
      } else {
        // Fallback to SQLite for development
        if (!sqlite3) {
          throw new Error('SQLite3 not available and PostgreSQL not configured');
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
      // Attempt graceful fallback to SQLite if available and not already using it
      if (this.type !== 'sqlite' && sqlite3 && !DISABLE_SQLITE_FALLBACK) {
        console.warn('Falling back to SQLite database...');
        this.type = 'sqlite';
        // Dispose any existing PG pool before switching
        if (this.pool) {
          try { await this.pool.end(); } catch (e) { /* noop */ }
          this.pool = null;
        }
        return new Promise((resolve, reject) => {
          this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
              console.error('Error connecting to SQLite database during fallback:', err);
              reject(err);
            } else {
              console.log('📚 Connected to SQLite database (fallback after failure)');
              resolve();
            }
          });
        });
      }
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
    if (this.pool) {
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
    if (this.pool) {
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
    if (this.pool) {
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
    if (this.pool) {
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


const database = new Database();

async function initializeDatabase() {
  try {
    await database.connect();
    if (database.type === 'postgres' || database.type === 'postgresql') {
      // Apply project schema file for PostgreSQL if enabled
      if (shouldApplySchemaOnStart()) {
        await applyPostgresSchemaFromFile();
      }
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

// Best-effort application of the repository schema on PostgreSQL
async function applyPostgresSchemaFromFile() {
  try {
    const schemaPath = path.join(__dirname, '..', 'database-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return;
    }
    let sql = await fs.promises.readFile(schemaPath, 'utf8');

    // Remove SQLite-specific audit_logs definition that uses AUTOINCREMENT
    sql = sql.replace(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+audit_logs\s*\([\s\S]*?AUTOINCREMENT[\s\S]*?\);\s*/i, '');

    const client = await database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('🛠 Applied database-schema.sql to PostgreSQL');
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn('⚠️ Applying database-schema.sql encountered an error; continuing with built-in schema:', err.message);
    } finally {
      client.release();
    }
  } catch (e) {
    console.warn('⚠️ Skipping schema file application:', e.message);
  }
}

function shouldApplySchemaOnStart() {
  const val = String(process.env.APPLY_SCHEMA_ON_START || '').toLowerCase().trim();
  return val === '1' || val === 'true' || val === 'yes';
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
      email_verification_token VARCHAR(255),
      email_verification_expires BIGINT,
      oauth_provider VARCHAR(50),
      oauth_id VARCHAR(255),
      avatar_url TEXT,
      reset_token VARCHAR(255),
      reset_token_expires BIGINT,
      failed_login_attempts INTEGER DEFAULT 0,
      lockout_expires BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
  `);

  // Create products table for PostgreSQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      type VARCHAR(100) NOT NULL,
      specs TEXT,
      description TEXT,
      image TEXT,
      model_qty INTEGER DEFAULT 0,
      soh INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create consumables table for PostgreSQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS consumables (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      type VARCHAR(100) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      model_qty INTEGER DEFAULT 0,
      soh INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create orders table for PostgreSQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      created_by VARCHAR(255) DEFAULT 'mechanic',
      total_items INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(50) DEFAULT 'normal',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Backfill missing columns for legacy deployments (safe no-ops with IF NOT EXISTS)
  await database.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT \'mechanic\'');
  await database.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_items INTEGER NOT NULL DEFAULT 0');
  await database.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'pending\'');
  await database.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT \'normal\'');
  await database.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT');
  await database.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await database.run('ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

  // Add 2FA columns to users table for PostgreSQL
  await database.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255)');
  await database.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false');
  await database.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT');

  // Create order_items table for PostgreSQL
  await database.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_name VARCHAR(255) NOT NULL,
      product_code VARCHAR(100),
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure legacy order_items have expected columns
  await database.run('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)');
  await database.run('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_code VARCHAR(100)');
  await database.run('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1');
  await database.run('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

  // Inventory table to track stock for products and consumables (PostgreSQL)
  await database.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('product', 'consumable')),
      item_id INTEGER NOT NULL,
      stock_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(item_type, item_id)
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

  // Create login attempts table for PostgreSQL (for DB-backed rate limiting)
  await database.run(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id SERIAL PRIMARY KEY,
      ip_address VARCHAR(45) NOT NULL,
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create settings table for PostgreSQL (store JSON as TEXT for cross-DB parity)
  await database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      data TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Backfill legacy settings tables missing updated_at
  await database.run('ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

  // Create indexes for better performance
  await database.run('CREATE INDEX IF NOT EXISTS idx_products_type ON products(type)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_products_code ON products(code)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_order_items_product_code ON order_items(product_code)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_consumables_category ON consumables(category)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_consumables_code ON consumables(code)');
  // Composite indexes for common query patterns
  await database.run('CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC)');
  await database.run('CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(is_active, role)');
  // Expression indexes on common JSON fields in details for faster filtering (PostgreSQL)
  // Use partial indexes guarded to rows where details appears to be JSON to avoid cast errors on legacy text rows
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_details_path ON audit_logs ((details::json->>\'path\')) WHERE substring(details from 1 for 1) IN (\'{\',\'[\')');
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_details_method ON audit_logs ((details::json->>\'method\')) WHERE substring(details from 1 for 1) IN (\'{\',\'[\')');
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_details_request_id ON audit_logs ((details::json->>\'requestId\')) WHERE substring(details from 1 for 1) IN (\'{\',\'[\')');
  await database.run('CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, created_at)');
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
      email_verification_token TEXT,
      email_verification_expires INTEGER,
      oauth_provider TEXT,
      oauth_id TEXT,
      avatar_url TEXT,
      reset_token TEXT,
      reset_token_expires INTEGER,
      failed_login_attempts INTEGER DEFAULT 0,
      lockout_expires INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create products table for SQLite
  await database.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      specs TEXT,
      description TEXT,
      image TEXT,
      model_qty INTEGER DEFAULT 0,
      soh INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create consumables table for SQLite
  await database.run(`
    CREATE TABLE IF NOT EXISTS consumables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      category TEXT,
      description TEXT,
      model_qty INTEGER DEFAULT 0,
      soh INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create orders table for SQLite
  await database.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_by TEXT DEFAULT 'mechanic',
      total_items INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create order_items table for SQLite
  await database.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_name TEXT NOT NULL,
      product_code TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
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

  // Create login attempts table for SQLite (for DB-backed rate limiting)
  await database.run(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inventory table to track stock for products and consumables (SQLite)
  await database.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL CHECK (item_type IN ('product', 'consumable')),
      item_id INTEGER NOT NULL,
      stock_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(item_type, item_id)
    )
  `);

  // Create settings table for SQLite (store JSON as TEXT)
  await database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      data TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Backfill legacy settings tables missing updated_at (SQLite lacks IF NOT EXISTS on ADD COLUMN in some versions)
  try {
    await database.run('ALTER TABLE settings ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  } catch (e) {
    // Ignore if column already exists
  }

  // Add 2FA columns to users table for SQLite
  try {
    await database.run('ALTER TABLE users ADD COLUMN totp_secret TEXT');
  } catch (e) {
    // Ignore if column already exists
  }
  try {
    await database.run('ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT 0');
  } catch (e) {
    // Ignore if column already exists
  }
  try {
    await database.run('ALTER TABLE users ADD COLUMN backup_codes TEXT');
  } catch (e) {
    // Ignore if column already exists
  }

  // Expression indexes on common JSON fields in details for faster filtering (SQLite JSON1)
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_details_path ON audit_logs (json_extract(details, \'$.path\'))');
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_details_method ON audit_logs (json_extract(details, \'$.method\'))');
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_details_request_id ON audit_logs (json_extract(details, \'$.requestId\'))');
  await database.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
}

async function createDefaultUsers() {
  // Create default admin user if it doesn't exist
  const existingAdmin = await database.get('SELECT id FROM users WHERE email = ?', ['admin@joshburt.com.au']);
  
  if (!existingAdmin) {
    const adminPassword = await bcrypt.hash('Admin123!', parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    await database.run(`
      INSERT INTO users (email, name, password_hash, role, email_verified)
      VALUES (?, ?, ?, ?, ?)
    `, ['admin@joshburt.com.au', 'Admin User', adminPassword, 'admin', true]);
    
    console.log('👑 Default admin user created: admin@joshburt.com.au / Admin123!');
  }

  // Create test users
  const testUser = await database.get('SELECT id FROM users WHERE email = ?', ['test@example.com']);
  if (!testUser) {
    const testPassword = await bcrypt.hash('Password123!', parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    await database.run(`
      INSERT INTO users (email, name, password_hash, role, email_verified)
      VALUES (?, ?, ?, ?, ?)
    `, ['test@example.com', 'Test User', testPassword, 'user', true]);
    
    console.log('👤 Test user created: test@example.com / Password123!');
  }

  const managerUser = await database.get('SELECT id FROM users WHERE email = ?', ['manager@example.com']);
  if (!managerUser) {
    const managerPassword = await bcrypt.hash('Manager123!', parseInt(process.env.BCRYPT_ROUNDS) || 12);
    
    await database.run(`
      INSERT INTO users (email, name, password_hash, role, email_verified)
      VALUES (?, ?, ?, ?, ?)
    `, ['manager@example.com', 'Manager User', managerPassword, 'manager', true]);
    
    console.log('👔 Manager user created: manager@example.com / Manager123!');
  }
}

module.exports = {
  database,
  initializeDatabase
};