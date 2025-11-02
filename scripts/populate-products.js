// Script to populate products table from JSON data
const { database, initializeDatabase } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function populateProducts() {
  try {
    console.log('🔄 Initializing database connection...');
    await initializeDatabase();

    // Read products data from JSON
    const productsPath = path.join(__dirname, '..', 'data', 'products.json');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

    console.log(`📦 Found ${productsData.length} products to import`);

    // Check if products table already has data
    const existingCount = await database.get('SELECT COUNT(*) as count FROM products');
    console.log(`📊 Current products in database: ${existingCount.count}`);

    if (existingCount.count > 0) {
      console.log('⚠️  Products table already has data. Skipping import.');
      console.log('💡 To force reimport, run: DELETE FROM products;');
      return;
    }

    // Insert each product
    let imported = 0;
    for (const item of productsData) {
      try {
        await database.run(`
          INSERT INTO products (name, code, type, specs, description, image)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          item.name,
          item.code,
          item.type,
          item.specs || '',
          item.description || '',
          item.image || ''
        ]);
        imported++;
      } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
          console.log(`⚠️  Skipping duplicate: ${item.name} (${item.code})`);
        } else {
          console.error(`❌ Error importing ${item.name}:`, error.message);
        }
      }
    }

    console.log(`✅ Successfully imported ${imported} products`);

    // Verify import
    const finalCount = await database.get('SELECT COUNT(*) as count FROM products');
    console.log(`📊 Total products in database: ${finalCount.count}`);

  } catch (error) {
    console.error('❌ Error populating products:', error);
  } finally {
    try {
      await database.close();
      console.log('🔐 Database connection closed');
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
  }
}

// Run if called directly
if (require.main === module) {
  populateProducts();
}

module.exports = { populateProducts };