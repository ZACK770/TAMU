import { Router } from 'express';
import { createExam, createToken, getAllExams, deleteExam } from '../controllers/admin.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication
router.post('/exams', authenticateToken, createExam);
router.get('/exams', authenticateToken, getAllExams);
router.delete('/exams/:id', authenticateToken, deleteExam);
router.post('/tokens', authenticateToken, createToken);

export default router;
