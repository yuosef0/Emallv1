// src/routes/subscription.routes.ts
import express from 'express';
import { 
  upgradeSubscription, 
  getSubscriptionStats, 
  getExpiredSubscriptions,
  getSubscriptionRevenue 
} from '../controllers/subscription.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// 🔒 كل الـ routes محمية
router.use(protect);

router.put('/upgrade/:shopId', upgradeSubscription);       // تحديث باقة محل
router.get('/stats', getSubscriptionStats);               // إحصائيات الباقات
router.get('/expired', getExpiredSubscriptions);          // المحلات منتهية الاشتراك
router.get('/revenue', getSubscriptionRevenue);           // إيرادات الاشتراكات

export default router;