// Ensure soh column exists on products and consumables; backfill from inventory if present
// Works with both Postgres and SQLite using the shared database wrapper

const { database, initializeDatabase } = require('../config/database');

async function columnExists(table, column) {
  if (database.pool) {
    const row = await database.get(
      'SELECT 1 FROM information_schema.columns WHERE table_name = ? AND column_name = ? LIMIT 1',
      [table, column]
    );
    return !!row;
  }
  const rows = await database.all(`PRAGMA table_info(${table})`);
  return Array.isArray(rows) && rows.some(r => String(r.name).toLowerCase() === column);
}

async function ensureSOHFor(table) {
  const exists = await columnExists(table, 'soh');
  if (!exists) {
    console.log(`Adding soh to ${table}...`);
    await database.run(`ALTER TABLE ${table} ADD COLUMN soh INTEGER DEFAULT 0`);
    console.log(`soh added to ${table}`);
  } else {
    console.log(`soh already exists on ${table}`);
  }
  // Backfill from inventory if available
  if (table === 'products') {
    // Join inventory item_type='product'
    await database.run(
      `UPDATE ${table} SET soh = COALESCE(soh, 0)`
    );
    const rows = await database.all('SELECT id FROM products');
    for (const r of rows) {
      const inv = await database.get('SELECT stock_count FROM inventory WHERE item_type = ? AND item_id = ?', ['product', r.id]);
      if (inv && typeof inv.stock_count === 'number') {
        await database.run('UPDATE products SET soh = ? WHERE id = ?', [inv.stock_count, r.id]);
      }
    }
  } else if (table === 'consumables') {
    // If we later track consumables in inventory, attempt backfill similarly
    await database.run(
      `UPDATE ${table} SET soh = COALESCE(soh, 0)`
    );
    const rows = await database.all('SELECT id FROM consumables');
    for (const r of rows) {
      const inv = await database.get('SELECT stock_count FROM inventory WHERE item_type = ? AND item_id = ?', ['consumable', r.id]);
      if (inv && typeof inv.stock_count === 'number') {
        await database.run('UPDATE consumables SET soh = ? WHERE id = ?', [inv.stock_count, r.id]);
      }
    }
  }
}

async function main() {
  try {
    await initializeDatabase();
    await ensureSOHFor('products');
    await ensureSOHFor('consumables');
    console.log('Ensured soh exists and is backfilled on products and consumables');
    await database.close();
  } catch (e) {
    console.error('Migration failed:', e);
    try { await database.close(); } catch(_) { console.warn('close failed'); }
    process.exit(1);
  }
}

main();
