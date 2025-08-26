import pool from '../config/database';

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...');
    
    // إنشاء جدول المستخدمين
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'customer',
        status VARCHAR(20) DEFAULT 'active',
        phone VARCHAR(20),
        avatar_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');
    
    // إنشاء جدول المتاجر
    await client.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        description TEXT,
        category VARCHAR(20) DEFAULT 'all',
        city VARCHAR(50),
        address TEXT,
        phone VARCHAR(20),
        plan_tier VARCHAR(20) DEFAULT 'first',
        status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        subscription_expires_at TIMESTAMP,
        logo_url VARCHAR(255),
        banner_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Shops table created');
    
    // إنشاء جدول المنتجات
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        quantity INTEGER DEFAULT 0,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        category VARCHAR(20),
        subcategory VARCHAR(100),
        discount INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        images JSON,
        specifications JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created');
    
    // إنشاء جدول عناصر السلة
    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);
    console.log('✅ Cart items table created');
    
    // إنشاء جدول الطلبات
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shop_id INTEGER REFERENCES shops(id),
        status VARCHAR(20) DEFAULT 'pending',
        delivery_method VARCHAR(20) DEFAULT 'delivery',
        delivery_address TEXT,
        phone_number VARCHAR(20),
        total_price DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Orders table created');
    
    // إنشاء جدول منتجات الطلبات
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_products (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price_at_time DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Order products table created');
    
    // إنشاء جدول الاشتراكات
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        plan_tier VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP NOT NULL,
        auto_renew BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Subscriptions table created');
    
    // إنشاء جدول المدفوعات
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        subscription_id INTEGER REFERENCES subscriptions(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        transaction_id VARCHAR(100),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Payments table created');
    
    // إنشاء جدول الإشعارات
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Notifications table created');
    
    // إنشاء جدول سجل النشاطات
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        details JSON,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Activity logs table created');
    
    // إنشاء جدول التصنيفات
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        parent_id INTEGER REFERENCES categories(id),
        description TEXT,
        image_url VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Categories table created');
    
    // إنشاء جدول العناوين
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        city VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Addresses table created');
    
    // إنشاء الفهارس لتحسين الأداء
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigrations().catch(console.error);