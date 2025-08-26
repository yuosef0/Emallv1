import pool from '../config/database';

export interface NotificationData {
  user_id: number;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export class NotificationService {
  // إنشاء إشعار جديد
  static async createNotification(data: NotificationData) {
    try {
      const result = await pool.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [data.user_id, data.title, data.message, data.type || 'info']);
      
      return result.rows[0];
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // الحصول على إشعارات المستخدم
  static async getUserNotifications(userId: number, limit = 20, offset = 0) {
    try {
      const result = await pool.query(`
        SELECT * FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);
      
      return result.rows;
    } catch (error) {
      console.error('Get user notifications error:', error);
      throw error;
    }
  }

  // تحديث حالة القراءة
  static async markAsRead(notificationId: number) {
    try {
      const result = await pool.query(`
        UPDATE notifications 
        SET is_read = true 
        WHERE id = $1 
        RETURNING *
      `, [notificationId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  }

  // حذف إشعار
  static async deleteNotification(notificationId: number, userId: number) {
    try {
      const result = await pool.query(`
        DELETE FROM notifications 
        WHERE id = $1 AND user_id = $2 
        RETURNING *
      `, [notificationId, userId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  // إرسال إشعار لجميع المستخدمين
  static async broadcastNotification(title: string, message: string, type = 'info') {
    try {
      const result = await pool.query(`
        INSERT INTO notifications (user_id, title, message, type)
        SELECT id, $1, $2, $3 FROM users
        RETURNING *
      `, [title, message, type]);
      
      return result.rows;
    } catch (error) {
      console.error('Broadcast notification error:', error);
      throw error;
    }
  }

  // إرسال إشعار لجميع التجار
  static async notifyShopOwners(title: string, message: string, type = 'info') {
    try {
      const result = await pool.query(`
        INSERT INTO notifications (user_id, title, message, type)
        SELECT DISTINCT owner_id, $1, $2, $3 FROM shops
        RETURNING *
      `, [title, message, type]);
      
      return result.rows;
    } catch (error) {
      console.error('Notify shop owners error:', error);
      throw error;
    }
  }
}