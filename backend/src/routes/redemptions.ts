import { Router } from 'express';
import { redeemBenefit, getMyRedemptions, getAllRedemptions, processRedemption } from '../controllers/redemptions.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// User routes
router.post('/benefits/:benefitId/redeem', authenticateToken, redeemBenefit);
router.get('/my-redemptions', authenticateToken, getMyRedemptions);

// Admin routes
router.get('/', authenticateToken, getAllRedemptions);
router.patch('/:redemptionId', authenticateToken, processRedemption);

export default router;
