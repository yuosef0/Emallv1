// src/controllers/product.controller.ts - محدث
import { Request, Response } from 'express';
import pool from '../config/database';

// ✅ إضافة منتج لمحل
export const addProduct = async (req: Request, res: Response) => {
  const { name, description, price, quantity, image_url, category, discount = 0 } = req.body;
  const { shopId } = req.params;

  try {
    // التحقق من وجود المحل والصلاحية
    const shopCheck = await pool.query(
      'SELECT plan_tier, subscription_expires_at FROM shops WHERE id = $1',
      [shopId]
    );
    
    if (shopCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    const shop = shopCheck.rows[0];
    if (new Date(shop.subscription_expires_at) < new Date()) {
      return res.status(403).json({ message: 'Shop subscription has expired' });
    }
    
    const result = await pool.query(
      `INSERT INTO products (name, description, price, quantity, image_url, shop_id, category, discount, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [name, description, price, quantity, image_url, shopId, category, discount]
    );
    
    res.status(201).json({ 
      message: 'Product added successfully', 
      product: result.rows[0] 
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ جلب منتجات محل معين
export const getProductsByShop = async (req: Request, res: Response) => {
  const { shopId } = req.params;

  try {
    const result = await pool.query(`
      SELECT p.*, s.name as shop_name, s.plan_tier
      FROM products p
      JOIN shops s ON p.shop_id = s.id
      WHERE p.shop_id = $1
      ORDER BY p.created_at DESC
    `, [shopId]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get products by shop error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ جلب منتج واحد
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT p.*, s.name as shop_name, s.plan_tier, s.city, s.address
      FROM products p
      JOIN shops s ON p.shop_id = s.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🆕 جلب جميع المنتجات مع ترتيب المحلات حسب الباقة
export const getAllProductsOrdered = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, category } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  try {
    let categoryFilter = '';
    const params: any[] = [limit, offset];
    
    if (category && category !== 'all') {
      categoryFilter = 'WHERE p.category = $3';
      params.push(category);
    }
    
    const result = await pool.query(`
      SELECT p.*, 
        s.name as shop_name, 
        s.plan_tier,
        s.city,
        CASE s.plan_tier 
          WHEN 'first' THEN 1 
          WHEN 'second' THEN 2 
          WHEN 'third' THEN 3 
        END as priority
      FROM products p
      JOIN shops s ON p.shop_id = s.id
      ${categoryFilter}
      ORDER BY priority, p.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);
    
    // عدد المنتجات الكلي للـ pagination
    const countQuery = category && category !== 'all' 
      ? 'SELECT COUNT(*) FROM products p WHERE p.category = $1'
      : 'SELECT COUNT(*) FROM products';
    
    const countParams = category && category !== 'all' ? [category] : [];
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      products: result.rows,
      pagination: {
        current_page: Number(page),
        total_pages: Math.ceil(countResult.rows[0].count / Number(limit)),
        total_products: Number(countResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get all products ordered error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🆕 البحث في المنتجات مع الترتيب
export const searchProducts = async (req: Request, res: Response) => {
  const { keyword } = req.params;
  const { category, min_price, max_price } = req.query;
  
  try {
    let filters = '';
    const params = [`%${keyword}%`];
    let paramIndex = 2;
    
    if (category && category !== 'all') {
      filters += ` AND p.category = $${paramIndex}`;
      params.push(category as string);
      paramIndex++;
    }
    
    if (min_price) {
      filters += ` AND p.price >= $${paramIndex}`;
      params.push(min_price as string);
      paramIndex++;
    }
    
    if (max_price) {
      filters += ` AND p.price <= $${paramIndex}`;
      params.push(max_price as string);
      paramIndex++;
    }
    
    const result = await pool.query(`
      SELECT p.*, 
        s.name as shop_name, 
        s.plan_tier,
        s.city,
        CASE s.plan_tier 
          WHEN 'first' THEN 1 
          WHEN 'second' THEN 2 
          WHEN 'third' THEN 3 
        END as priority
      FROM products p
      JOIN shops s ON p.shop_id = s.id
      WHERE (p.name ILIKE $1 OR p.description ILIKE $1)
      ${filters}
      ORDER BY priority, p.created_at DESC
    `, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🆕 جلب المنتجات المميزة (من المحلات الفئة الأولى)
export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, s.name as shop_name, s.city
      FROM products p
      JOIN shops s ON p.shop_id = s.id
      WHERE s.plan_tier = 'first' 
        AND s.subscription_expires_at > NOW()
        AND p.quantity > 0
      ORDER BY p.created_at DESC
      LIMIT 12
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🆕 تحديث منتج
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, quantity, image_url, category, discount } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE products 
      SET name = $1, description = $2, price = $3, quantity = $4, 
          image_url = $5, category = $6, discount = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [name, description, price, quantity, image_url, category, discount, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ 
      message: 'Product updated successfully', 
      product: result.rows[0] 
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🆕 حذف منتج
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};