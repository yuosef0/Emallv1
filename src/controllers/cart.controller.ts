// src/controllers/cart.controller.ts
import { Request, Response } from 'express';
import pool from '../config/database';

export const checkoutOrder = async (req: Request, res: Response) => {
  try {
    const { user_id, delivery_method } = req.body;

    const cartResult = await pool.query(
      `SELECT ci.product_id, ci.quantity, p.price, p.discount
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [user_id]
    );

    const cartItems = cartResult.rows;

    let total_price = 0;

    for (const item of cartItems) {
      const priceAfterDiscount = parseFloat(item.price) - parseFloat(item.discount);
      total_price += priceAfterDiscount * item.quantity;
    }

    const orderResult = await pool.query(
      `INSERT INTO orders (customer_id, delivery_method, total_price, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [user_id, delivery_method, total_price]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of cartItems) {
      await pool.query(
        `INSERT INTO order_products (order_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [orderId, item.product_id, item.quantity]
      );
    }

    await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [user_id]);

    res.json({ message: 'Order placed successfully', order_id: orderId });

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCartItem = async (req: Request, res: Response) => {
  const { user_id, product_id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM cart_items 
       WHERE user_id = $1 AND product_id = $2`,
      [user_id, product_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



export const updateCartItemQuantity = async (req: Request, res: Response) => {
  const { user_id, product_id } = req.params;
  const { quantity } = req.body;

  try {
    const result = await pool.query(
      `UPDATE cart_items 
       SET quantity = $1 
       WHERE user_id = $2 AND product_id = $3
       RETURNING *`,
      [quantity, user_id, product_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    res.status(200).json({ message: 'Quantity updated successfully', item: result.rows[0] });
  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// ✅ Get all items in user's cart
export const getUserCart = async (req: Request, res: Response) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        ci.id, ci.quantity, ci.added_at,
        p.name AS product_name,
        p.price, p.discount, p.image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
      `,
      [user_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Add item to cart
export const addToCart = async (req: Request, res: Response) => {
  const userId = req.body.user_id; // هنوصلها من الواجهة أو التوكين لاحقًا
  const { productId } = req.params;
  const { quantity } = req.body;

  try {
    // Check if product already in cart
    const existing = await pool.query(
      `SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );

    if (existing.rows.length > 0) {
      // Update quantity if already in cart
      await pool.query(
        `UPDATE cart_items SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3`,
        [quantity, userId, productId]
      );
    } else {
      // Add new item
      await pool.query(
        `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)`,
        [userId, productId, quantity]
      );
    }

    res.status(200).json({ message: 'Item added to cart' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get user's cart
export const getCart = async (req: Request, res: Response) => {
  const userId = req.query.user_id; // مؤقتًا من الـ query

  try {
    const result = await pool.query(
      `SELECT ci.*, p.name, p.price, p.image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Remove item from cart
export const removeFromCart = async (req: Request, res: Response) => {
  const userId = req.body.user_id;
  const { productId } = req.params;

  try {
    await pool.query(
      `DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );
    res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
