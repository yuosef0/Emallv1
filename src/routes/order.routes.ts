import express from 'express';
import { checkoutOrder  } from '../controllers/order.controller';

const router = express.Router();

router.post('/checkout', checkoutOrder ); // ✅ تأكيد الطلب

export default router;
