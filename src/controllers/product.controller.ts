import { Request, Response } from 'express';
import pool from '../config/database';

// ✅ Add product to a shop
export const addProduct = async (req: Request, res: Response) => {
  const { name, description, price, quantity, image_url } = req.body;
  const { shopId } = req.params;

  try {
    const result = await pool.query(
      `INSERT INTO products (name, description, price, quantity, image_url, shop_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, price, quantity, image_url, shopId]
    );
    res.status(201).json({ message: 'Product added successfully', product: result.rows[0] });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get all products for a shop
export const getProductsByShop = async (req: Request, res: Response) => {
  const { shopId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE shop_id = $1',
      [shopId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get products by shop error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get single product
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
