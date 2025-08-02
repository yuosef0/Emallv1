// src/middlewares/validation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// تسجيل مستخدم عادي
export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    full_name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: error.details[0].message 
    });
  }
  next();
};

// تسجيل صاحب محل
export const validateShopOwnerRegister = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    full_name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    shop_name: Joi.string().min(2).max(100).required(),
    category: Joi.string().valid('men', 'women', 'kids', 'all').required(),
    description: Joi.string().max(500),
    city: Joi.string().min(2).max(50).required(),
    address: Joi.string().min(5).max(200).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: error.details[0].message 
    });
  }
  next();
};

// تسجيل الدخول
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: error.details[0].message 
    });
  }
  next();
};

// إضافة منتج
export const validateAddProduct = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(1000),
    price: Joi.number().positive().required(),
    quantity: Joi.number().integer().min(0).required(),
    image_url: Joi.string().uri().allow(''),
    category: Joi.string().valid('men', 'women', 'kids').required(),
    discount: Joi.number().min(0).default(0)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: error.details[0].message 
    });
  }
  next();
};

// إضافة إلى السلة
export const validateAddToCart = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    user_id: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().positive().default(1)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: error.details[0].message 
    });
  }
  next();
};

// تأكيد الطلب
export const validateCheckout = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    user_id: Joi.number().integer().positive().required(),
    delivery_method: Joi.string().valid('pickup', 'delivery').required(),
    delivery_address: Joi.string().when('delivery_method', {
      is: 'delivery',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    phone_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: error.details[0].message 
    });
  }
  next();
};

// تحديث باقة الاشتراك
export const validateSubscriptionUpgrade = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    newPlan: Joi.string().valid('first', 'second', 'third').required(),
    duration: Joi.number().integer().positive().min(1).max(12).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: error.details[0].message 
    });
  }
  next();
};

// تحديث حالة المحل
export const validateShopStatusUpdate = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'suspended').required(),
    rejection_reason: Joi.string().when('status', {
      is: 'rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: error.details[0].message 
    });
  }
  next();
};