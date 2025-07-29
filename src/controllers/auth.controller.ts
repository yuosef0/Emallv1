import { Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const register = async (req: Request, res: Response) => {
  const { full_name, email, password } = req.body;

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, email, hashedPassword, 'customer']
    );

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.rows[0].id,
        full_name: newUser.rows[0].full_name,
        email: newUser.rows[0].email,
        role: newUser.rows[0].role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const registerShopOwner = async (req: Request, res: Response) => {
  const {
    full_name,
    email,
    password,
    shop_name,
    category,
    description,
    city,
    address,
  } = req.body;

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      'INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, email, hashedPassword, 'shop_owner']
    );

    const user = userResult.rows[0];

    const shopResult = await pool.query(
      'INSERT INTO shops (name, owner_id, category, description, city, address, package, plan_tier, merchant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [shop_name, user.id, category, description, city, address, 'third', 'third', user.id]
    );

    return res.status(201).json({
      message: 'Shop owner registered successfully',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
      shop: shopResult.rows[0],
    });
  } catch (err) {
    console.error('Register shop owner error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
