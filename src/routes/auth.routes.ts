// src/routes/auth.routes.ts
import express from 'express';
import { register } from '../controllers/auth.controller';
import { login } from '../controllers/auth.controller';
import { registerShopOwner } from '../controllers/auth.controller';
const router = express.Router();
router.post('/register-shop-owner', registerShopOwner);
router.post('/register', register);
router.post('/login', login);
export default router;
