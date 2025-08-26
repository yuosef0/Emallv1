import express from 'express';
import { NotificationService } from '../services/notification.service';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// 🔒 كل الـ routes تتطلب تسجيل دخول
router.use(protect);

// 🔔 الحصول على إشعارات المستخدم
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const notifications = await NotificationService.getUserNotifications(userId, limit, offset);
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'خطأ في جلب الإشعارات' });
  }
});

// ✅ تحديث حالة القراءة
router.put('/:id/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const notification = await NotificationService.markAsRead(notificationId);
    res.json(notification);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'خطأ في تحديث الإشعار' });
  }
});

// 🗑️ حذف إشعار
router.delete('/:id', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    
    const notification = await NotificationService.deleteNotification(notificationId, userId);
    res.json({ message: 'تم حذف الإشعار بنجاح', notification });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'خطأ في حذف الإشعار' });
  }
});

// 📊 إحصائيات الإشعارات
router.get('/stats', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read
      FROM notifications 
      WHERE user_id = $1
    `, [userId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ message: 'خطأ في جلب إحصائيات الإشعارات' });
  }
});

export default router;