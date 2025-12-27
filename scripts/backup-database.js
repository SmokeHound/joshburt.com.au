#!/usr/bin/env node

/**
 * Database Backup Script
 * Generates database backups in various formats
 * Part of Phase 4: Data Management
 */

// Load .env for local development
require('dotenv').config();

const { database } = require('../config/database');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

function resolvePgDumpCommand() {
  return process.env.PG_DUMP_PATH || 'pg_dump';
}

function buildPgDumpArgs(tables = []) {
  const databaseUrl = process.env.DATABASE_URL;
  const databaseName = process.env.DB_NAME || process.env.DB_DATABASE;

  // Prefer connection string if provided (common in CI), otherwise fall back to discrete params.
  const args = databaseUrl
    ? ['--dbname', databaseUrl]
    : [
      '-h',
      process.env.DB_HOST,
      '-p',
      process.env.DB_PORT || '5432',
      '-U',
      process.env.DB_USER,
      '-d',
      databaseName
    ];

  args.push('--no-password', '--clean', '--if-exists');

  if (Array.isArray(tables) && tables.length > 0) {
    tables.forEach(table => {
      args.push('-t', table);
    });
  }

  return args;
}

function formatPgDumpNotFoundMessage(originalMessage) {
  const isWindows = process.platform === 'win32';
  const isNetlify = String(process.env.NETLIFY || '').toLowerCase() === 'true';

  const lines = [
    `pg_dump not found (${originalMessage}).`,
    'Install PostgreSQL client tools so pg_dump is available, or set PG_DUMP_PATH to the full path to pg_dump.',
    isNetlify
      ? 'Note: Netlify Functions typically do not ship with pg_dump. For SQL backups, run this worker in an external environment (local machine/CI) where pg_dump is installed, or use JSON/CSV backups.'
      : null,
    '',
    'Examples:',
    isWindows
      ? '  - Windows: setx PG_DUMP_PATH "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"'
      : '  - macOS/Linux: export PG_DUMP_PATH=/usr/local/bin/pg_dump',
    '  - Or add the PostgreSQL bin directory to your PATH.',
    '',
    'Note: you may need to restart your terminal after changing environment variables.'
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * Generate SQL backup using pg_dump
 */
function generateSQLBackup(tables = [], compression = 'gzip') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${timestamp}.sql${compression === 'gzip' ? '.gz' : ''}`;
  const filePath = path.join(os.tmpdir(), fileName);

  return new Promise((resolve, reject) => {
    const args = buildPgDumpArgs(tables);

    const pgDump = spawn(resolvePgDumpCommand(), args, {
      env: { ...process.env, PGPASSWORD: process.env.DB_PASS }
    });

    pgDump.on('error', err => {
      if (err && err.code === 'ENOENT') {
        reject(new Error(formatPgDumpNotFoundMessage(err.message)));
        return;
      }

      reject(new Error('pg_dump execution failed: ' + (err?.message || String(err))));
    });

    let output = '';
    let errorOutput = '';

    pgDump.stdout.on('data', data => {
      output += data.toString();
    });

    pgDump.stderr.on('data', data => {
      errorOutput += data.toString();
    });

    pgDump.on('close', async code => {
      if (code !== 0) {
        reject(new Error(`pg_dump failed: ${errorOutput}`));
        return;
      }

      try {
        if (compression === 'gzip') {
          const compressed = await gzip(Buffer.from(output));
          await fs.writeFile(filePath, compressed);
        } else {
          await fs.writeFile(filePath, output);
        }

        const stats = await fs.stat(filePath);

        resolve({
          filePath,
          fileSize: stats.size,
          format: 'sql',
          compression
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Generate JSON backup
 */
async function generateJSONBackup(pool, tables = [], compression = 'gzip') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${timestamp}.json${compression === 'gzip' ? '.gz' : ''}`;
  const filePath = path.join(os.tmpdir(), fileName);

  const backup = {
    generated_at: new Date().toISOString(),
    database: process.env.DB_NAME,
    tables: {}
  };

  // Get list of tables to backup
  let tablesToBackup = tables;
  if (tablesToBackup.length === 0) {
    const tablesQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    const result = await pool.query(tablesQuery);
    tablesToBackup = result.rows.map(r => r.tablename);
  }

  // Backup each table
  for (const table of tablesToBackup) {
    const result = await pool.query(`SELECT * FROM ${table}`);
    backup.tables[table] = {
      row_count: result.rows.length,
      data: result.rows
    };
  }

  const jsonData = JSON.stringify(backup, null, 2);

  if (compression === 'gzip') {
    const compressed = await gzip(Buffer.from(jsonData));
    await fs.writeFile(filePath, compressed);
  } else {
    await fs.writeFile(filePath, jsonData);
  }

  const stats = await fs.stat(filePath);

  return {
    filePath,
    fileSize: stats.size,
    format: 'json',
    compression
  };
}

/**
 * Generate CSV backup
 */
async function generateCSVBackup(pool, tables = [], _compression = 'none') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseDir = path.join(os.tmpdir(), `backup-${timestamp}`);
  await fs.mkdir(baseDir, { recursive: true });

  // Get list of tables to backup
  let tablesToBackup = tables;
  if (tablesToBackup.length === 0) {
    const tablesQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    const result = await pool.query(tablesQuery);
    tablesToBackup = result.rows.map(r => r.tablename);
  }

  // Export each table to CSV
  for (const table of tablesToBackup) {
    const result = await pool.query(`SELECT * FROM ${table}`);

    if (result.rows.length === 0) {continue;}

    const headers = Object.keys(result.rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      const values = headers.map(h => {
        const value = row[h];
        if (value === null) {return '';}
        if (typeof value === 'object') {return `"${JSON.stringify(value).replace(/"/g, '""')}"`;}
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const csvPath = path.join(baseDir, `${table}.csv`);
    await fs.writeFile(csvPath, csvContent);
  }

  // Get total size
  const files = await fs.readdir(baseDir);
  let totalSize = 0;
  for (const file of files) {
    const stats = await fs.stat(path.join(baseDir, file));
    totalSize += stats.size;
  }

  return {
    filePath: baseDir,
    fileSize: totalSize,
    format: 'csv',
    compression: 'none'
  };
}

/**
 * Create backup based on configuration
 */
async function createBackup(backupConfig) {
  const pool = await (async () => { await database.connect(); return database.pool; })();

  try {
    const { id, format, compression, tables } = backupConfig;

    // Update status to running
    await pool.query('UPDATE backups SET status = $1 WHERE id = $2', ['running', id]);

    let result;

    // Generate backup based on format
    if (format === 'sql') {
      result = await generateSQLBackup(tables || [], compression || 'gzip');
    } else if (format === 'json') {
      result = await generateJSONBackup(pool, tables || [], compression || 'gzip');
    } else if (format === 'csv') {
      result = await generateCSVBackup(pool, tables || [], compression || 'none');
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Calculate metadata
    const metadata = {
      tables_backed_up: tables?.length || 'all',
      generated_by: 'backup-worker'
    };

    // Update backup record with results
    await pool.query(
      `UPDATE backups 
       SET status = $1, file_path = $2, file_size = $3, 
           completed_at = NOW(), metadata = $4
       WHERE id = $5`,
      ['completed', result.filePath, result.fileSize, JSON.stringify(metadata), id]
    );

    console.log(`Backup ${id} completed successfully`);
    console.log(`- File: ${result.filePath}`);
    console.log(`- Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);

    return result;
  } catch (error) {
    console.error('Backup failed:', error.message);

    // Update backup record with error
    await pool.query(
      `UPDATE backups 
       SET status = $1, error_message = $2, completed_at = NOW()
       WHERE id = $3`,
      ['failed', error.message, backupConfig.id]
    );

    throw error;
  } finally {
    // do not close shared pool here; caller manages lifecycle
  }
}

/**
 * Process pending backups
 */
async function processPendingBackups() {
  const pool = await (async () => { await database.connect(); return database.pool; })();
  try {
    // Get pending backups
    const result = await pool.query(
      `SELECT * FROM backups 
       WHERE status = 'pending' 
       ORDER BY started_at ASC 
       LIMIT 5`
    );

    if (result.rows.length === 0) {
      console.log('No pending backups found');
      return;
    }

    console.log(`Found ${result.rows.length} pending backup(s)`);

    // Process each backup
    for (const backup of result.rows) {
      console.log(`Processing backup ${backup.id}...`);
      await createBackup(backup);
    }

    console.log('All pending backups processed');
  } finally {
    // do not close shared pool here; caller manages lifecycle
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'process') {
    await processPendingBackups();
  } else if (command === 'watch') {
    console.log('Starting backup worker in watch mode...');
    console.log('Checking for pending backups every 5 minutes');

    // Process immediately
    await processPendingBackups();

    // Then check every 5 minutes
    setInterval(
      async () => {
        console.log('\n--- Checking for pending backups ---');
        await processPendingBackups();
      },
      5 * 60 * 1000
    );
  } else {
    console.log('Usage:');
    console.log('  node scripts/backup-database.js process  - Process pending backups once');
    console.log(
      '  node scripts/backup-database.js watch    - Run in watch mode (checks every 5 min)'
    );
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

// Ensure DB pool closed on exit
process.on('beforeExit', async () => {
  try {
    await database.close();
  } catch (e) {
    // ignore
  }
});

module.exports = {
  createBackup,
  generateSQLBackup,
  generateJSONBackup,
  generateCSVBackup,
  processPendingBackups
};
