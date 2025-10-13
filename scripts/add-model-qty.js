// Ensure model_qty column exists on products and consumables, with default/backfill
// Works with both Postgres and SQLite using the shared database wrapper

const { database, initializeDatabase } = require('../config/database');

async function columnExists(table, column) {
  if (database.pool) {
    // Postgres
    const row = await database.get(
      'SELECT 1 FROM information_schema.columns WHERE table_name = ? AND column_name = ? LIMIT 1',
      [table, column]
    );
    return !!row;
  }
  // SQLite
  const rows = await database.all(`PRAGMA table_info(${table})`);
  return Array.isArray(rows) && rows.some(r => String(r.name).toLowerCase() === column);
}

async function ensureColumn(table, column, type) {
  const exists = await columnExists(table, column);
  if (!exists) {
    console.log(`Adding ${column} to ${table}...`);
    await database.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type} DEFAULT 0`);
    console.log(`${column} added to ${table}`);
  } else {
    console.log(`${column} already exists on ${table}`);
  }
  await database.run(`UPDATE ${table} SET ${column} = COALESCE(${column}, 0)`);
}

async function main() {
  try {
    await initializeDatabase();
    const type = database.pool ? 'INTEGER' : 'INTEGER';
    await ensureColumn('products', 'model_qty', type);
    await ensureColumn('consumables', 'model_qty', type);
    console.log('Ensured model_qty exists and is populated on products and consumables');
    await database.close();
  } catch (e) {
    console.error('Migration failed:', e);
    try { await database.close(); } catch(_) { console.warn('close failed'); }
    process.exit(1);
  }
}

main();
