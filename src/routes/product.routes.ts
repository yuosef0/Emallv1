// src/routes/product.routes.ts - محدث
import express from 'express';
import {
  addProduct,
  getProductsByShop,
  getProductById,
  getAllProductsOrdered,
  searchProducts,
  getFeaturedProducts,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// 🔍 البحث والعرض العام
router.get('/search/:keyword', searchProducts);          // البحث في المنتجات
router.get('/featured', getFeaturedProducts);            // المنتجات المميزة
router.get('/all', getAllProductsOrdered);               // جميع المنتجات مرتبة حسب الباقة

// 🏪 منتجات محل معين
router.get('/shop/:shopId', getProductsByShop);          // منتجات محل

// 🔒 العمليات المحمية (تتطلب تسجيل دخول)
router.post('/:shopId', protect, addProduct);            // إضافة منتج
router.put('/:id', protect, updateProduct);              // تحديث منتج
router.delete('/:id', protect, deleteProduct);           // حذف منتج

// 📦 منتج واحد (في النهاية عشان ميتضاربش مع الأعلى)
router.get('/:id', getProductById);                      // منتج معيّن

export default router;