import { Request, Response } from 'express';
import pool from '../config/database';

export const checkoutOrder = async (req: Request, res: Response) => {
  try {
    const { user_id, delivery_method } = req.body;

    // 1. جلب المنتجات من السلة
    const cartResult = await pool.query(
      `SELECT ci.product_id, ci.quantity AS cart_quantity, p.price, p.discount
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [user_id]
    );

    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // 2. حساب السعر الكلي
    let total_price = 0;
    for (const item of cartItems) {
      const priceAfterDiscount = parseFloat(item.price) - parseFloat(item.discount);
      total_price += priceAfterDiscount * item.cart_quantity;
    }

    // 3. إدخال الطلب في جدول orders
   const orderResult = await pool.query(
  `INSERT INTO orders (customer_id, status, delivery_method, total_price, created_at)
   VALUES ($1, $2, $3, $4, NOW())
   RETURNING id`,
  [user_id, 'pending', delivery_method, total_price]
);

    const orderId = orderResult.rows[0].id;

    // 4. إدخال تفاصيل المنتجات الخاصة بالطلب في جدول order_products
    for (const item of cartItems) {
      await pool.query(
        `INSERT INTO order_products (order_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [orderId, item.product_id, item.cart_quantity]
      );
    }

    // 5. حذف العناصر من السلة بعد تأكيد الطلب
    await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [user_id]);

    // 6. الرد بنجاح العملية
    res.json({ message: 'Order placed successfully', order_id: orderId });

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
