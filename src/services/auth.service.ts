// src/services/auth.service.ts
import pool from '../config/database';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/generateToken';
interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  role: 'customer' | 'merchant' | 'admin';
}

export const registerUser = async ({ full_name, email, password, role }: RegisterData) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role',
    [full_name, email, hashedPassword, role]
  );
  return result.rows[0];
};
interface LoginData {
  email: string;
  password: string;
}

export const loginUser = async ({ email, password }: LoginData) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user.id, user.role);

  return {
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    }
  };
};