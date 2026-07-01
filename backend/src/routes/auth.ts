import { Router } from 'express';
import { sendCode, verifyCode, register, adminLogin } from '../controllers/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/send-code', authLimiter, sendCode);
router.post('/verify-code', authLimiter, verifyCode);
router.post('/register', register);
router.post('/admin-login', authLimiter, adminLogin);

export default router;
