// src/middlewares/security.ts
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// Rate limiting للـ APIs
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد أقصى 100 طلب لكل IP
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting للتسجيل والدخول
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات فقط
  message: {
    error: 'Too many authentication attempts, please try again later.'
  }
});

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
});

// تسجيل العمليات المهمة
export const logActivity = async (req: Request, res: Response, next: NextFunction) => {
  const sensitiveRoutes = ['/api/admin', '/api/subscriptions'];
  const shouldLog = sensitiveRoutes.some(route => req.path.startsWith(route));
  
  if (shouldLog && req.user) {
    try {
      const pool = require('../config/database').default;
      await pool.query(`
        INSERT INTO activity_logs (user_id, action, entity_type, details, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        req.user.id,
        `${req.method} ${req.path}`,
        req.path.split('/')[3] || 'unknown',
        JSON.stringify({ body: req.body, params: req.params }),
        req.ip
      ]);
    } catch (error) {
      console.error('Activity logging failed:', error);
    }
  }
  
  next();
};