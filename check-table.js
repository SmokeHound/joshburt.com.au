const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RCwEhZ2pm6vx@ep-broad-term-a75jcieo-pooler.ap-southeast-2.aws.neon.tech:5432/neondb',
  ssl: true
});

async function checkTable() {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customer_purchase_patterns'
      );
    `);
    console.log('customer_purchase_patterns table exists:', result.rows[0].exists);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
