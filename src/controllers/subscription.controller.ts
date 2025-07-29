// src/controllers/subscription.controller.ts
import { Request, Response } from 'express';
import pool from '../config/database';

// 🔄 تحديث باقة المحل
export const upgradeSubscription = async (req: Request, res: Response) => {
  const { shopId } = req.params;
  const { newPlan, duration } = req.body; // first, second, third & duration in months
  
  try {
    // حساب تاريخ انتهاء الاشتراك
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + duration);
    
    const result = await pool.query(
      `UPDATE shops 
       SET plan_tier = $1, package = $1, subscription_expires_at = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [newPlan, expiryDate, shopId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    res.json({ 
      message: 'Subscription upgraded successfully', 
      shop: result.rows[0] 
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 📊 جلب إحصائيات الاشتراكات
export const getSubscriptionStats = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        plan_tier,
        COUNT(*) as shop_count,
        COUNT(CASE WHEN subscription_expires_at > NOW() THEN 1 END) as active_count
      FROM shops 
      GROUP BY plan_tier
      ORDER BY 
        CASE plan_tier 
          WHEN 'first' THEN 1 
          WHEN 'second' THEN 2 
          WHEN 'third' THEN 3 
        END
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ⚠️ جلب المحلات منتهية الاشتراك
export const getExpiredSubscriptions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.email as owner_email
      FROM shops s
      JOIN users u ON s.owner_id = u.id
      WHERE s.subscription_expires_at < NOW()
      ORDER BY s.subscription_expires_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get expired subscriptions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 💰 جلب إيرادات الاشتراكات
export const getSubscriptionRevenue = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    
    let query = `
      SELECT 
        plan_tier,
        COUNT(*) as subscriptions_count,
        CASE plan_tier
          WHEN 'first' THEN COUNT(*) * 500
          WHEN 'second' THEN COUNT(*) * 300  
          WHEN 'third' THEN COUNT(*) * 100
        END as revenue
      FROM shops s
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM s.created_at) = $1 AND EXTRACT(YEAR FROM s.created_at) = $2`;
      params.push(month, year);
    }
    
    query += ` GROUP BY plan_tier ORDER BY revenue DESC`;
    
    const result = await pool.query(query, params);
    
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseInt(row.revenue), 0);
    
    res.json({
      breakdown: result.rows,
      total_revenue: totalRevenue
    });
  } catch (error) {
    console.error('Get subscription revenue error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};