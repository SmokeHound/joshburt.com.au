// Node.js script to import products.json and consumables.json into Neon (Postgres)
// Usage: node scripts/import-to-neon.js

const fs = require('fs');
const { Client } = require('pg');

const NEON_URL = process.env.NEON_DATABASE_URL || 'your_neon_connection_string_here';

async function importData() {
  const client = new Client({ connectionString: NEON_URL });
  await client.connect();

  // Import products
  const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
  for (const p of products) {
    await client.query(
      `INSERT INTO products (name, code, type, specs, description, image) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO NOTHING`,
      [p.name, p.code, p.type, p.specs, p.description, p.image || '']
    );
  }

  // Import consumables
  const consumables = JSON.parse(fs.readFileSync('data/consumables.json', 'utf8'));
  for (const c of consumables) {
    await client.query(
      `INSERT INTO consumables (name, code, type, category, description) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO NOTHING`,
      [c.name, c.code, c.type, c.category, c.description]
    );
  }

  await client.end();
  console.log('Import complete!');
}

importData().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
