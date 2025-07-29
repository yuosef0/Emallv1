// src/routes/cart.routes.ts
import express from 'express';
import { addToCart, 
    getCart, 
    removeFromCart,
    getUserCart,
    updateCartItemQuantity,
    deleteCartItem,
    
} from '../controllers/cart.controller';

const router = express.Router();

router.post('/:productId', addToCart);       // ➕ إضافة للسلة
router.get('/', getCart);                    // 📦 استعراض السلة
router.delete('/:productId', removeFromCart); // ❌ حذف منتج من السلة
router.get('/:user_id', getUserCart);
router.put('/:user_id/:product_id', updateCartItemQuantity);
router.delete('/:user_id/:product_id', deleteCartItem);

export default router;
