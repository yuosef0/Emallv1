import pool from '../config/database';

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Starting database reset...');
    
    // حذف جميع الجداول بالترتيب الصحيح
    const tables = [
      'order_products',
      'orders',
      'cart_items',
      'products',
      'subscriptions',
      'payments',
      'notifications',
      'activity_logs',
      'addresses',
      'shops',
      'categories',
      'users'
    ];
    
    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️ Could not drop table ${table}:`, error);
      }
    }
    
    console.log('🎉 Database reset completed successfully!');
    console.log('💡 Run "npm run migrate" to recreate tables');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

resetDatabase().catch(console.error);