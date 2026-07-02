import { Router } from 'express';
import { getMyStats, getAdminStats } from '../controllers/stats.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// User routes
router.get('/me', authenticateToken, getMyStats);

// Admin routes
router.get('/admin', authenticateToken, getAdminStats);

export default router;
