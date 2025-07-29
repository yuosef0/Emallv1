// src/controllers/shop.controller.ts - محدث
import { Request, Response } from 'express';
import pool from '../config/database';

// ✅ جلب جميع المحلات مع ترتيب الباقات
export const getAllShops = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
        u.full_name as owner_name,
        CASE s.plan_tier 
          WHEN 'first' THEN 1 
          WHEN 'second' THEN 2 
          WHEN 'third' THEN 3 
        END as priority,
        CASE 
          WHEN s.subscription_expires_at > NOW() THEN 'active'
          ELSE 'expired'
        END as subscription_status
      FROM shops s
      JOIN users u ON s.owner_id = u.id
      ORDER BY priority, s.created_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get all shops error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ جلب المحلات حسب الفئة (رجالي، حريمي، أطفال)
export const getShopsByCategory = async (req: Request, res: Response) => {
  const { category } = req.params; // men, women, kids, all
  
  try {
    let categoryFilter = '';
    const params: any[] = [];
    
    if (category !== 'all') {
      categoryFilter = `WHERE (s.category = $1 OR s.category LIKE '%' || $1 || '%')`;
      params.push(category);
    }
    
    const result = await pool.query(`
      SELECT s.*, 
        u.full_name as owner_name,
        CASE s.plan_tier 
          WHEN 'first' THEN 1 
          WHEN 'second' THEN 2 
          WHEN 'third' THEN 3 
        END as priority,
        CASE 
          WHEN s.subscription_expires_at > NOW() THEN 'active'
          ELSE 'expired'
        END as subscription_status
      FROM shops s 
      JOIN users u ON s.owner_id = u.id
      ${categoryFilter}
      ORDER BY priority, s.created_at DESC
    `, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get shops by category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ جلب محل واحد مع تفاصيله ومنتجاته
export const getShopById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // جلب بيانات المحل
    const shopResult = await pool.query(`
      SELECT s.*, 
        u.full_name as owner_name, u.email as owner_email,
        CASE 
          WHEN s.subscription_expires_at > NOW() THEN 'active'
          ELSE 'expired'
        END as subscription_status
      FROM shops s
      JOIN users u ON s.owner_id = u.id
      WHERE s.id = $1
    `, [id]);
    
    if (shopResult.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    // جلب منتجات المحل
    const productsResult = await pool.query(`
      SELECT * FROM products 
      WHERE shop_id = $1 
      ORDER BY created_at DESC
    `, [id]);
    
    const shop = shopResult.rows[0];
    shop.products = productsResult.rows;
    
    res.status(200).json(shop);
  } catch (error) {
    console.error('Get shop by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ البحث في المحلات مع الترتيب
export const searchShops = async (req: Request, res: Response) => {
  const { keyword } = req.params;

  try {
    const result = await pool.query(`
      SELECT s.*, 
        u.full_name as owner_name,
        CASE s.plan_tier 
          WHEN 'first' THEN 1 
          WHEN 'second' THEN 2 
          WHEN 'third' THEN 3 
        END as priority,
        CASE 
          WHEN s.subscription_expires_at > NOW() THEN 'active'
          ELSE 'expired'
        END as subscription_status
      FROM shops s
      JOIN users u ON s.owner_id = u.id
      WHERE s.category ILIKE $1 
         OR s.name ILIKE $1 
         OR s.city ILIKE $1
         OR s.description ILIKE $1
      ORDER BY priority, s.created_at DESC
    `, [`%${keyword}%`]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Search shops error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🆕 جلب المحلات المميزة (الفئة الأولى فقط)
export const getFeaturedShops = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
        u.full_name as owner_name,
        (SELECT COUNT(*) FROM products WHERE shop_id = s.id) as products_count
      FROM shops s
      JOIN users u ON s.owner_id = u.id
      WHERE s.plan_tier = 'first' 
        AND s.subscription_expires_at > NOW()
      ORDER BY s.created_at DESC
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get featured shops error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🆕 إحصائيات المحل
export const getShopStats = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM products WHERE shop_id = $1) as total_products,
        (SELECT COUNT(*) FROM order_products op 
         JOIN products p ON op.product_id = p.id 
         WHERE p.shop_id = $1) as total_orders,
        (SELECT COALESCE(SUM(op.quantity * p.price), 0) 
         FROM order_products op 
         JOIN products p ON op.product_id = p.id 
         WHERE p.shop_id = $1) as total_revenue
    `, [id]);
    
    res.json(statsResult.rows[0]);
  } catch (error) {
    console.error('Get shop stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};