import express from 'express';
import { SearchService } from '../services/search.service';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// 🔍 البحث في المنتجات
router.get('/products', async (req, res) => {
  try {
    const filters = {
      query: req.query.q as string,
      category: req.query.category as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      shop_id: req.query.shop_id ? parseInt(req.query.shop_id as string) : undefined,
      sortBy: req.query.sortBy as 'price' | 'name' | 'created_at' | 'popularity',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const result = await SearchService.searchProducts(filters);
    res.json(result);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'خطأ في البحث' });
  }
});

// 🔍 البحث في المتاجر
router.get('/shops', async (req, res) => {
  try {
    const filters = {
      query: req.query.q as string,
      category: req.query.category as string,
      sortBy: req.query.sortBy as 'name' | 'created_at' | 'popularity',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const result = await SearchService.searchShops(filters);
    res.json(result);
  } catch (error) {
    console.error('Search shops error:', error);
    res.status(500).json({ message: 'خطأ في البحث' });
  }
});

// 🏷️ الحصول على التصنيفات
router.get('/categories', async (req, res) => {
  try {
    const categories = await SearchService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'خطأ في جلب التصنيفات' });
  }
});

// 💰 الحصول على نطاقات الأسعار
router.get('/price-ranges', async (req, res) => {
  try {
    const priceRanges = await SearchService.getPriceRanges();
    res.json(priceRanges);
  } catch (error) {
    console.error('Get price ranges error:', error);
    res.status(500).json({ message: 'خطأ في جلب نطاقات الأسعار' });
  }
});

export default router;