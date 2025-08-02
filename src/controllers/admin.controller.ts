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