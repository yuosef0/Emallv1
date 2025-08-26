// src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import pool from '../config/database';

// 📊 لوحة التحكم الرئيسية - إحصائيات عامة
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
        (SELECT COUNT(*) FROM users WHERE role = 'shop_owner') as total_merchants,
        (SELECT COUNT(*) FROM shops) as total_shops,
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(SUM(total_price), 0) FROM orders) as total_revenue,
        (SELECT COUNT(*) FROM shops WHERE subscription_expires_at > NOW()) as active_subscriptions,
        (SELECT COUNT(*) FROM shops WHERE subscription_expires_at <= NOW()) as expired_subscriptions
    `;
    
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];
    
    // إحصائيات الباقات
    const subscriptionStats = await pool.query(`
      SELECT 
        plan_tier,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM shops), 2) as percentage
      FROM shops 
      GROUP BY plan_tier
      ORDER BY 
        CASE plan_tier 
          WHEN 'first' THEN 1 
          WHEN 'second' THEN 2 
          WHEN 'third' THEN 3 
        END
    `);
    
    res.json({
      overview: stats,
      subscription_breakdown: subscriptionStats.rows
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 👥 إدارة المستخدمين
export const getAllUsers = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, role } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  try {
    let roleFilter = '';
    const params: any[] = [limit, offset];
    
    if (role && role !== 'all') {
      roleFilter = 'WHERE role = $3';
      params.push(role);
    }
    
    const result = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.role, u.created_at,
        CASE 
          WHEN u.role = 'shop_owner' THEN s.name
          ELSE NULL
        END as shop_name
      FROM users u
      LEFT JOIN shops s ON u.id = s.owner_id
      ${roleFilter}
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);
    
    const countQuery = role && role !== 'all' 
      ? 'SELECT COUNT(*) FROM users WHERE role = $1'
      : 'SELECT COUNT(*) FROM users';
    const countParams = role && role !== 'all' ? [role] : [];
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      users: result.rows,
      pagination: {
        current_page: Number(page),
        total_pages: Math.ceil(countResult.rows[0].count / Number(limit)),
        total_users: Number(countResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🏪 إدارة المحلات - قبول/رفض
export const updateShopStatus = async (req: Request, res: Response) => {
  const { shopId } = req.params;
  const { status, rejection_reason } = req.body; // approved, rejected, suspended
  
  try {
    let updateQuery = '';
    let params: any[] = [];
    
    if (status === 'rejected') {
      updateQuery = `
        UPDATE shops 
        SET status = $1, rejection_reason = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      params = [status, rejection_reason, shopId];
    } else {
      updateQuery = `
        UPDATE shops 
        SET status = $1, rejection_reason = NULL, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      params = [status, shopId];
    }
    
    const result = await pool.query(updateQuery, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    res.json({ 
      message: `Shop ${status} successfully`, 
      shop: result.rows[0] 
    });
  } catch (error) {
    console.error('Update shop status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📋 المحلات المعلقة الموافقة
export const getPendingShops = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.full_name as owner_name, u.email as owner_email
      FROM shops s
      JOIN users u ON s.owner_id = u.id
      WHERE s.status = 'pending'
      ORDER BY s.created_at ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get pending shops error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📊 تقرير مبيعات شهري
export const getMonthlySalesReport = async (req: Request, res: Response) => {
  const { year = new Date().getFullYear(), month } = req.query;
  
  try {
    let dateFilter = 'WHERE EXTRACT(YEAR FROM o.created_at) = $1';
    const params: any[] = [year];
    
    if (month) {
      dateFilter += ' AND EXTRACT(MONTH FROM o.created_at) = $2';
      params.push(month);
    }
    
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('month', o.created_at) as month,
        COUNT(o.id) as total_orders,
        SUM(o.total_price) as total_revenue,
        AVG(o.total_price) as average_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM orders o
      ${dateFilter}
      GROUP BY DATE_TRUNC('month', o.created_at)
      ORDER BY month DESC
    `, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get monthly sales report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🏆 أفضل المحلات أداءً
export const getTopPerformingShops = async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  
  try {
    const result = await pool.query(`
      SELECT 
        s.id, s.name, s.plan_tier,
        COUNT(op.id) as total_sales,
        SUM(op.quantity * p.price) as total_revenue,
        AVG(p.price) as avg_product_price
      FROM shops s
      JOIN products p ON s.id = p.shop_id
      JOIN order_products op ON p.id = op.product_id
      GROUP BY s.id, s.name, s.plan_tier
      ORDER BY total_revenue DESC
      LIMIT $1
    `, [limit]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get top performing shops error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🚫 حظر/إلغاء حظر مستخدم
export const toggleUserStatus = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { action } = req.body; // 'ban' or 'unban'
  
  try {
    const status = action === 'ban' ? 'banned' : 'active';
    
    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: `User ${action}ned successfully`, 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 💰 تحديث أسعار الباقات
export const updateSubscriptionPrices = async (req: Request, res: Response) => {
  const { first_price, second_price, third_price } = req.body;
  
  try {
    // يفترض وجود جدول لأسعار الباقات
    const result = await pool.query(`
      INSERT INTO subscription_prices (first_tier, second_tier, third_tier, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        first_tier = $1, second_tier = $2, third_tier = $3, updated_at = NOW()
      RETURNING *
    `, [first_price, second_price, third_price]);
    
    res.json({ 
      message: 'Subscription prices updated successfully',
      prices: result.rows[0]
    });
  } catch (error) {
    console.error('Update subscription prices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🆕 إضافة تاجر جديد
export const addNewShop = async (req: Request, res: Response) => {
  const { 
    shop_name, 
    owner_email, 
    owner_full_name, 
    owner_password, 
    plan_tier = 'first',
    description,
    address,
    phone
  } = req.body;

  try {
    // التحقق من وجود البريد الإلكتروني
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [owner_email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        message: 'البريد الإلكتروني مستخدم بالفعل' 
      });
    }

    // إنشاء المستخدم الجديد
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(owner_password, 10);
    
    const newUser = await pool.query(`
      INSERT INTO users (full_name, email, password, role, status, created_at)
      VALUES ($1, $2, $3, 'shop_owner', 'active', NOW())
      RETURNING id
    `, [owner_full_name, owner_email, hashedPassword]);

    const userId = newUser.rows[0].id;

    // إنشاء المتجر
    const newShop = await pool.query(`
      INSERT INTO shops (
        name, owner_id, description, address, phone, 
        plan_tier, status, subscription_expires_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'approved', 
        CASE 
          WHEN $6 = 'first' THEN NOW() + INTERVAL '1 month'
          WHEN $6 = 'second' THEN NOW() + INTERVAL '3 months'
          WHEN $6 = 'third' THEN NOW() + INTERVAL '12 months'
        END, NOW())
      RETURNING *
    `, [shop_name, userId, description, address, phone, plan_tier]);

    res.status(201).json({
      message: 'تم إنشاء التاجر والمتجر بنجاح',
      shop: newShop.rows[0],
      owner: {
        id: userId,
        full_name: owner_full_name,
        email: owner_email
      }
    });

  } catch (error) {
    console.error('Add new shop error:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// 🆕 حذف تاجر ومتجره
export const deleteShop = async (req: Request, res: Response) => {
  const { shopId } = req.params;
  const { delete_products = false } = req.body;

  try {
    // التحقق من وجود المتجر
    const shopCheck = await pool.query(
      'SELECT id, owner_id, name FROM shops WHERE id = $1',
      [shopId]
    );

    if (shopCheck.rows.length === 0) {
      return res.status(404).json({ message: 'المتجر غير موجود' });
    }

    const shop = shopCheck.rows[0];

    // بدء المعاملة
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      if (delete_products) {
        // حذف جميع منتجات المتجر
        await client.query(
          'DELETE FROM order_products WHERE product_id IN (SELECT id FROM products WHERE shop_id = $1)',
          [shopId]
        );
        await client.query('DELETE FROM products WHERE shop_id = $1', [shopId]);
      } else {
        // إلغاء تفعيل المنتجات بدلاً من حذفها
        await client.query(
          'UPDATE products SET status = "inactive" WHERE shop_id = $1',
          [shopId]
        );
      }

      // حذف الطلبات المرتبطة بالمتجر
      await client.query(
        'DELETE FROM order_products WHERE product_id IN (SELECT id FROM products WHERE shop_id = $1)',
        [shopId]
      );

      // حذف المتجر
      await client.query('DELETE FROM shops WHERE id = $1', [shopId]);

      // حذف المستخدم (صاحب المتجر)
      await client.query('DELETE FROM users WHERE id = $1', [shop.owner_id]);

      await client.query('COMMIT');

      res.json({
        message: `تم حذف المتجر "${shop.name}" وصاحبه بنجاح`,
        deleted_shop_id: shopId,
        deleted_owner_id: shop.owner_id
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete shop error:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// 🆕 الحصول على قائمة جميع المتاجر
export const getAllShops = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, plan_tier } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  try {
    let whereClause = '';
    const params: any[] = [limit, offset];
    let paramIndex = 3;

    if (status && status !== 'all') {
      whereClause += `WHERE s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (plan_tier && plan_tier !== 'all') {
      whereClause += whereClause ? ' AND' : 'WHERE';
      whereClause += ` s.plan_tier = $${paramIndex}`;
      params.push(plan_tier);
      paramIndex++;
    }

    const result = await pool.query(`
      SELECT 
        s.*,
        u.full_name as owner_name,
        u.email as owner_email,
        COUNT(p.id) as total_products,
        COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_products
      FROM shops s
      JOIN users u ON s.owner_id = u.id
      LEFT JOIN products p ON s.id = p.shop_id
      ${whereClause}
      GROUP BY s.id, u.full_name, u.email
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    // حساب العدد الإجمالي
    let countQuery = `
      SELECT COUNT(*) FROM shops s
      JOIN users u ON s.owner_id = u.id
    `;
    let countParams: any[] = [];
    
    if (status && status !== 'all') {
      countQuery += ' WHERE s.status = $1';
      countParams.push(status);
    }
    
    if (plan_tier && plan_tier !== 'all') {
      countQuery += countParams.length ? ' AND' : ' WHERE';
      countQuery += ' s.plan_tier = $' + (countParams.length + 1);
      countParams.push(plan_tier);
    }

    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      shops: result.rows,
      pagination: {
        current_page: Number(page),
        total_pages: Math.ceil(countResult.rows[0].count / Number(limit)),
        total_shops: Number(countResult.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Get all shops error:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};