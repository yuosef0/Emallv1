// src/routes/shop.routes.ts - محدث
import express from 'express';
import { 
  getAllShops, 
  getShopById, 
  searchShops,
  getShopsByCategory,
  getFeaturedShops,
  getShopStats
} from '../controllers/shop.controller';

const router = express.Router();

// 🔍 البحث والتصنيفات
router.get('/search/:keyword', searchShops);              // البحث في المحلات
router.get('/category/:category', getShopsByCategory);    // المحلات حسب الفئة (men/women/kids)
router.get('/featured', getFeaturedShops);               // المحلات المميزة (الفئة الأولى)

// 📊 الإحصائيات
router.get('/:id/stats', getShopStats);                  // إحصائيات محل معين

// 🏪 العمليات الأساسية
router.get('/', getAllShops);                            // جميع المحلات
router.get('/:id', getShopById);                         // محل معين مع منتجاته

export default router;