// src/routes/cart.routes.ts
import express from 'express';
import { 
    addToCart, 
    getUserCart,
    updateCartItemQuantity,
    deleteCartItem,
    checkoutOrder // نقلناها من order controller
} from '../controllers/cart.controller';

const router = express.Router();

// ✅ Routes مرتبة ومش متضاربة
router.get('/user/:user_id', getUserCart);                    // 📦 جلب سلة مستخدم معين
router.post('/add/:productId', addToCart);                    // ➕ إضافة للسلة
router.put('/user/:user_id/product/:product_id', updateCartItemQuantity); // 🔄 تحديث الكمية
router.delete('/user/:user_id/product/:product_id', deleteCartItem);      // ❌ حذف من السلة
router.post('/checkout', checkoutOrder);   

export default router;
