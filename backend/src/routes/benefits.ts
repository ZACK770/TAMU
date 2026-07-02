import { Router } from 'express';
import { getAvailableBenefits, createBenefit, updateBenefit, deleteBenefit, getAllBenefits } from '../controllers/benefits.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// User routes
router.get('/available', authenticateToken, getAvailableBenefits);

// Admin routes
router.post('/', authenticateToken, createBenefit);
router.get('/', authenticateToken, getAllBenefits);
router.patch('/:id', authenticateToken, updateBenefit);
router.delete('/:id', authenticateToken, deleteBenefit);

export default router;
