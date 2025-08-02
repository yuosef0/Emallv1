// src/scripts/seed.ts
import pool from '../config/database';
import bcrypt from 'bcrypt';

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // مسح البيانات الموجودة
    await client.query('TRUNCATE TABLE activity_logs, notifications, subscription_payments, order_products, orders, cart_items, products, shops, users RESTART IDENTITY CASCADE');
    
    // إنشاء مستخدمين تجريبيين
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const usersResult = await client.query(`
      INSERT INTO users (full_name, email, password, role) VALUES 
      ('Admin User', 'admin@emall.com', $1, 'admin'),
      ('أحمد محمد', 'ahmed@test.com', $1, 'shop_owner'),
      ('فاطمة علي', 'fatma@test.com', $1, 'shop_owner'),
      ('محمد حسن', 'mohamed@test.com', $1, 'shop_owner'),
      ('سارة أحمد', 'sara@customer.com', $1, 'customer'),
      ('علي محمود', 'ali@customer.com', $1, 'customer')
      RETURNING id, full_name, role
    `, [hashedPassword]);
    
    console.log('✅ Users created:', usersResult.rows.length);
    
    // إنشاء محلات تجريبية
    const shopsData = [
      {
        name: 'Fashion Hub',
        owner_id: usersResult.rows[1].id,
        category: 'all',
        description: 'أحدث صيحات الموضة للرجال والنساء',
        city: 'المنيا',
        address: 'شارع التحرير، وسط البلد',
        plan_tier: 'first'
      },
      {
        name: 'Kids World',
        owner_id: usersResult.rows[2].id,
        category: 'kids',
        description: 'عالم الأطفال - ملابس وألعاب',
        city: 'المنيا',
        address: 'شارع الجمهورية',
        plan_tier: 'first'
      },
      {
        name: 'Classic Men',
        owner_id: usersResult.rows[3].id,
        category: 'men',
        description: 'الأناقة الكلاسيكية للرجال',
        city: 'المنيا',
        address: 'شارع المحطة',
        plan_tier: 'second'
      }
    ];
    
    const shopsResult = await client.query(`
      INSERT INTO shops (name, owner_id, category, description, city, address, plan_tier, package, status, merchant_id, subscription_expires_at) 
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $7, 'approved', $2, NOW() + INTERVAL '3 months'),
      ($8, $9, $10, $11, $12, $13, $14, $14, 'approved', $9, NOW() + INTERVAL '3 months'),
      ($15, $16, $17, $18, $19, $20, $21, $21, 'approved', $16, NOW() + INTERVAL '3 months')
      RETURNING id, name
    `, [
      ...Object.values(shopsData[0]),
      ...Object.values(shopsData[1]),
      ...Object.values(shopsData[2])
    ]);
    
    console.log('✅ Shops created:', shopsResult.rows.length);
    
    // إنشاء منتجات تجريبية
    const productsData = [
      // Fashion Hub products
      { name: 'قميص رجالي قطني', description: 'قميص قطني عالي الجودة', price: 299, quantity: 50, shop_id: shopsResult.rows[0].id, category: 'men', discount: 20 },
      { name: 'فستان سهرة أنيق', description: 'فستان سهرة للمناسبات الخاصة', price: 599, quantity: 30, shop_id: shopsResult.rows[0].id, category: 'women', discount: 50 },
      { name: 'بنطلون جينز رجالي', description: 'جينز عصري للرجال', price: 399, quantity: 40, shop_id: shopsResult.rows[0].id, category: 'men', discount: 0 },
      
      // Kids World products
      { name: 'تيشيرت أطفال ملون', description: 'تيشيرت قطني للأطفال', price: 89, quantity: 100, shop_id: shopsResult.rows[1].id, category: 'kids', discount: 10 },
      { name: 'فستان طفلة وردي', description: 'فستان جميل للبنات', price: 149, quantity: 60, shop_id: shopsResult.rows[1].id, category: 'kids', discount: 0 },
      { name: 'حذاء رياضي للأطفال', description: 'حذاء مريح للأطفال', price: 199, quantity: 80, shop_id: shopsResult.rows[1].id, category: 'kids', discount: 15 },
      
      // Classic Men products
      { name: 'بدلة رسمية كلاسيكية', description: 'بدلة أنيقة للمناسبات الرسمية', price: 1299, quantity: 15, shop_id: shopsResult.rows[2].id, category: 'men', discount: 100 },
      { name: 'قميص أبيض كلاسيكي', description: 'قميص أبيض للعمل', price: 179, quantity: 70, shop_id: shopsResult.rows[2].id, category: 'men', discount: 0 },
      { name: 'ربطة عنق حريرية', description: 'ربطة عنق فاخرة', price: 129, quantity: 90, shop_id: shopsResult.rows[2].id, category: 'men', discount: 20 }
    ];
    
    for (const product of productsData) {
      await client.query(`
        INSERT INTO products (name, description, price, quantity, shop_id, category, discount)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, Object.values(product));
    }
    
    console.log('✅ Products created:', productsData.length);
    
    // إنشاء بعض العناصر في السلة
    await client.query(`
      INSERT INTO cart_items (user_id, product_id, quantity) VALUES 
      ($1, 1, 2),
      ($1, 3, 1),
      ($2, 4, 3),
      ($2, 6, 1)
    `, [usersResult.rows[4].id, usersResult.rows[5].id]);
    
    console.log('✅ Cart items created');
    
    // إنشاء بعض الطلبات التجريبية
    const orderResult = await client.query(`
      INSERT INTO orders (customer_id, status, delivery_method, delivery_address, phone_number, total_price)
      VALUES ($1, 'delivered', 'delivery', 'شارع الكورنيش، المنيا', '01234567890', 598.00)
      RETURNING id
    `, [usersResult.rows[4].id]);
    
    await client.query(`
      INSERT INTO order_products (order_id, product_id, quantity, price_at_time)
      VALUES ($1, 1, 2, 299.00)
    `, [orderResult.rows[0].id]);
    
    console.log('✅ Sample order created');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${usersResult.rows.length}`);
    console.log(`- Shops: ${shopsResult.rows.length}`);
    console.log(`- Products: ${productsData.length}`);
    console.log('\n🔐 Test Accounts:');
    console.log('Admin: admin@emall.com / 123456');
    console.log('Shop Owner: ahmed@test.com / 123456');
    console.log('Customer: sara@customer.com / 123456');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedDatabase();