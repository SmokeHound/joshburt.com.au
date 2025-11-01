const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Database configuration - PostgreSQL only
const DB_TYPE = 'postgres';

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
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 10000
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
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 10000
  };

class Database {
  constructor() {
    this.pool = null; // PostgreSQL
    this.type = DB_TYPE;
  }

  async connect() {
    try {
      this.pool = new Pool(pgConfig);
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('📚 Connected to PostgreSQL database');
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
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  // Utility to convert SQL with placeholders to the correct format
  _prepareQuery(sql, params = []) {
    // PostgreSQL uses $1, $2, etc.
    let pgSql = sql;
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
    return { sql: pgSql, params };
  }

  async run(sql, params = []) {
    const { sql: preparedSql, params: preparedParams } = this._prepareQuery(sql, params);
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
  }

  async get(sql, params = []) {
    const { sql: preparedSql, params: preparedParams } = this._prepareQuery(sql, params);
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
  }

  async all(sql, params = []) {
    const { sql: preparedSql, params: preparedParams } = this._prepareQuery(sql, params);
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
  }
}


const database = new Database();

async function initializeDatabase() {
  try {
    await database.connect();
    // Apply project schema file for PostgreSQL if enabled
    if (shouldApplySchemaOnStart()) {
      await applyPostgresSchemaFromFile();
    }
    await createPostgreSQLTables();
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

  // Ensure all timestamp columns exist before creating indexes (for legacy databases)
  await database.run('ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await database.run('ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await database.run('ALTER TABLE consumables ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await database.run('ALTER TABLE consumables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

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