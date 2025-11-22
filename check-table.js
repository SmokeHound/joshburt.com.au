const { database } = require('./config/database');

async function checkTable() {
  try {
    await database.connect();
    const result = await database.get(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customer_purchase_patterns'
      ) as exists
    `);
    console.log('customer_purchase_patterns table exists:', result.exists);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await database.close();
  }
}

checkTable();
