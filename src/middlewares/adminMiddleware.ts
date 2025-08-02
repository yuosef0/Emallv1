// src/middlewares/adminMiddleware.ts
import { Request, Response, NextFunction } from 'express';

// التحقق من صلاحيات الأدمن
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

// التحقق من صلاحيات صاحب المحل أو الأدمن
export const requireShopOwnerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'shop_owner' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Shop owner or admin access required' });
  }
  
  next();
};

// التحقق من ملكية المحل
export const requireShopOwnership = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // إذا كان أدمن، يمر مباشرة
  if (req.user.role === 'admin') {
    return next();
  }
  
  const { shopId } = req.params;
  
  try {
    const pool = require('../config/database').default;
    const result = await pool.query(
      'SELECT owner_id FROM shops WHERE id = $1',
      [shopId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    
    if (result.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only manage your own shop' });
    }
    
    next();
  } catch (error) {
    console.error('Shop ownership check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};