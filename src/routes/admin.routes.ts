// src/routes/admin.routes.ts
import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  updateShopStatus,
  getPendingShops,
  getMonthlySalesReport,
  getTopPerformingShops,
  toggleUserStatus,
  updateSubscriptionPrices,
  addNewShop,
  deleteShop,
  getAllShops
} from '../controllers/admin.controller';
import { protect } from '../middlewares/authMiddleware';
import { requireAdmin } from '../middlewares/adminMiddleware';

const router = express.Router();

// 🔒 كل الـ routes تتطلب تسجيل دخول وصلاحيات أدمن
router.use(protect);
router.use(requireAdmin);

// 📊 لوحة التحكم والإحصائيات
router.get('/dashboard', getDashboardStats);               // إحصائيات عامة
router.get('/reports/monthly-sales', getMonthlySalesReport); // تقرير مبيعات شهري
router.get('/shops/top-performing', getTopPerformingShops); // أفضل المحلات

// 👥 إدارة المستخدمين
router.get('/users', getAllUsers);                         // جميع المستخدمين
router.put('/users/:userId/toggle-status', toggleUserStatus); // حظر/إلغاء حظر

// 🏪 إدارة المحلات
router.get('/shops', getAllShops);                         // 🆕 جميع المتاجر
router.get('/shops/pending', getPendingShops);             // المحلات المعلقة
router.post('/shops', addNewShop);                         // 🆕 إضافة تاجر جديد
router.put('/shops/:shopId/status', updateShopStatus);     // قبول/رفض محل
router.delete('/shops/:shopId', deleteShop);               // 🆕 حذف تاجر

// 💰 إدارة الأسعار
router.put('/subscription-prices', updateSubscriptionPrices); // تحديث أسعار الباقات

export default router;