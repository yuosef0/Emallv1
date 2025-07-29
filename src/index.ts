// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import shopRoutes from './routes/shop.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';

import cartRoutes from './routes/cart.routes';

dotenv.config();

const app = express(); // ✅ لازم يكون قبل app.use()

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/orders', orderRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes); // ✅ بعد تعريف app
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
