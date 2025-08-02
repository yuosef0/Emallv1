// src/controllers/cart.controller.ts - محسن
import { Request, Response } from 'express';
import pool from '../config/database';

// ✅ إضافة منتج للسلة
export const addToCart = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { user_id, quantity = 1 } = req.body;

  try {
    // التحقق من وجود المنتج والكمية المتاحة
    const productCheck = await pool.query(
      'SELECT id, quantity, name, price FROM products WHERE id = $1',
      [productId]
    );
    
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = productCheck.rows[0];
    if (product.quantity < quantity) {
      return res.status(400).json({ 
        message: 'Insufficient product quantity',
        available: product.quantity
      });
    }

    // التحقق من وجود المنتج في السلة
    const existingItem = await pool.query(
      'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [user_id, productId]
    );

    if (existingItem.rows.length > 0) {
      // تحديث الكمية
      const newQuantity = existingItem.rows[0].quantity + quantity;
      
      if (newQuantity > product.quantity) {
        return res.status(400).json({ 
          message: 'Total quantity exceeds available stock',
          available: product.quantity,
          current_in_cart: existingItem.rows[0].quantity
        });
      }
      
      await pool.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND product_id = $3',
        [newQuantity, user_id, productId]
      );
    } else {
      // إضافة عنصر جديد
      await pool.query(
        'INSERT INTO cart_items (user_id, product_id, quantity, added_at) VALUES ($1, $2, $3, NOW())',
        [user_id, productId, quantity]
      );
    }

    res.status(200).json({ message: 'Item added to cart successfully' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ جلب سلة المستخدم
export const getUserCart = async (req: Request, res: Response) => {
  const { user_id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        ci.id, ci.quantity, ci.added_at,
        p.id as product_id, p.name as product_name,
        p.price, p.discount, p.image_url, p.quantity as available_quantity,
        s.name as shop_name, s.city as shop_city,
        (p.price - COALESCE(p.discount, 0)) * ci.quantity as item_total
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN shops s ON p.shop_id = s.id
      WHERE ci.user_id = $1
      ORDER BY ci.added_at DESC
    `, [user_id]);

    const cartItems = result.rows;
    const totalPrice = cartItems.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    res.status(200).json({
      items: cartItems,
      summary: {
        total_items: totalItems,
        total_price: totalPrice.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ تحديث كمية منتج في السلة
export const updateCartItemQuantity = async (req: Request, res: Response) => {
  const { user_id, product_id } = req.params;
  const { quantity } = req.body;

  if (quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be greater than 0' });
  }

  try {
    // التحقق من الكمية المتاحة
    const productCheck = await pool.query(
      'SELECT quantity FROM products WHERE id = $1',
      [product_id]
    );
    
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (productCheck.rows[0].quantity < quantity) {
      return res.status(400).json({ 
        message: 'Quantity exceeds available stock',
        available: productCheck.rows[0].quantity
      });
    }

    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND product_id = $3 RETURNING *',
      [quantity, user_id, product_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    res.status(200).json({ 
      message: 'Quantity updated successfully', 
      item: result.rows[0] 
    });
  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ حذف منتج من السلة
export const deleteCartItem = async (req: Request, res: Response) => {
  const { user_id, product_id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *',
      [user_id, product_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    res.status(200).json({ message: 'Item removed from cart successfully' });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ مسح السلة بالكامل
export const clearCart = async (req: Request, res: Response) => {
  const { user_id } = req.params;

  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [user_id]);
    res.status(200).json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ تأكيد الطلب (Checkout)
export const checkoutOrder = async (req: Request, res: Response) => {
  const { user_id, delivery_method, delivery_address, phone_number } = req.body;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // جلب عناصر السلة
    const cartResult = await client.query(`
      SELECT ci.product_id, ci.quantity, p.price, p.discount, p.quantity as available_quantity
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `, [user_id]);

    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // التحقق من توفر الكميات
    for (const item of cartItems) {
      if (item.available_quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Insufficient quantity for product ID ${item.product_id}`,
          available: item.available_quantity,
          requested: item.quantity
        });
      }
    }

    // حساب السعر الكلي
    let totalPrice = 0;
    for (const item of cartItems) {
      const priceAfterDiscount = parseFloat(item.price) - (parseFloat(item.discount) || 0);
      totalPrice += priceAfterDiscount * item.quantity;
    }

    // إنشاء الطلب
    const orderResult = await client.query(`
      INSERT INTO orders (customer_id, status, delivery_method, delivery_address, phone_number, total_price, created_at)
      VALUES ($1, 'pending', $2, $3, $4, $5, NOW())
      RETURNING id
    `, [user_id, delivery_method, delivery_address, phone_number, totalPrice]);

    const orderId = orderResult.rows[0].id;

    // إضافة منتجات الطلب وتحديث المخزون
    for (const item of cartItems) {
      await client.query(`
        INSERT INTO order_products (order_id, product_id, quantity, price_at_time)
        VALUES ($1, $2, $3, $4)
      `, [orderId, item.product_id, item.quantity, item.price]);

      // تقليل الكمية من المخزون
      await client.query(`
        UPDATE products 
        SET quantity = quantity - $1 
        WHERE id = $2
      `, [item.quantity, item.product_id]);
    }

    // مسح السلة
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [user_id]);

    await client.query('COMMIT');

    res.json({ 
      message: 'Order placed successfully', 
      order_id: orderId,
      total_price: totalPrice
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Checkout error:', error);
    res.status(500).json({ message: 'Server error during checkout' });
  } finally {
    client.release();
  }
};