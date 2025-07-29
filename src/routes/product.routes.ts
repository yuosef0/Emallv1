import express from 'express';
import {
  addProduct,
  getProductsByShop,
  getProductById
} from '../controllers/product.controller';

const router = express.Router();

router.post('/:shopId', addProduct);         // ⬅️ إضافة منتج لمحل
router.get('/shop/:shopId', getProductsByShop); // ⬅️ كل منتجات محل
router.get('/:id', getProductById);           // ⬅️ منتج معيّن

export default router;
