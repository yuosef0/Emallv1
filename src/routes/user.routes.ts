import express from 'express';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// 🔐 راوت محمي بالتوكن - يعرض بيانات المستخدم الحالي
router.get('/me', protect, (req, res) => {
  res.json({
    message: 'This route is protected!',
    user: req.user
  });
});

export default router;
