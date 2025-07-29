import express from 'express';
import { getAllShops, getShopById, searchShops } from '../controllers/shop.controller';

const router = express.Router();

router.get('/search/:keyword', searchShops);

router.get('/', getAllShops);

router.get('/:id', getShopById);

export default router;
