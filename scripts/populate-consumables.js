// Script to populate consumables table from JSON data
const { database, initializeDatabase } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function populateConsumables() {
  try {
    console.log('🔄 Initializing database connection...');
    await initializeDatabase();
    
    // Read consumables data from JSON
    const consumablesPath = path.join(__dirname, '..', 'data', 'consumables.json');
    const consumablesData = JSON.parse(fs.readFileSync(consumablesPath, 'utf8'));
    
    console.log(`📦 Found ${consumablesData.length} consumables to import`);
    
    // Check if consumables table already has data
    const existingCount = await database.get('SELECT COUNT(*) as count FROM consumables');
    console.log(`📊 Current consumables in database: ${existingCount.count}`);
    
    if (existingCount.count > 0) {
      console.log('⚠️  Consumables table already has data. Skipping import.');
      console.log('💡 To force reimport, run: DELETE FROM consumables;');
      return;
    }
    
    // Insert each consumable
    let imported = 0;
    for (const item of consumablesData) {
      try {
        await database.run(`
          INSERT INTO consumables (name, code, type, category, description)
          VALUES (?, ?, ?, ?, ?)
        `, [
          item.name,
          item.code || '',
          item.type,
          item.category,
          item.description || ''
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
    
    console.log(`✅ Successfully imported ${imported} consumables`);
    
    // Verify import
    const finalCount = await database.get('SELECT COUNT(*) as count FROM consumables');
    console.log(`📊 Total consumables in database: ${finalCount.count}`);
    
  } catch (error) {
    console.error('❌ Error populating consumables:', error);
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
  populateConsumables();
}

module.exports = { populateConsumables };