import { Request, Response } from 'express';
import pool from '../config/database'; // تأكد إن ملف db.ts شغال

// ✅ Get all shops
export const getAllShops = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM shops');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get all shops error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get shop by ID
export const getShopById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM shops WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get shop by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Search shops
export const searchShops = async (req: Request, res: Response) => {
  const { keyword } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM shops WHERE category ILIKE $1 OR name ILIKE $1 OR city ILIKE $1`,
      [`%${keyword}%`]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Search shops error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

