import { Router } from 'express';
import { sendCode, verifyCode, register } from '../controllers/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/send-code', authLimiter, sendCode);
router.post('/verify-code', authLimiter, verifyCode);
router.post('/register', register);

export default router;
