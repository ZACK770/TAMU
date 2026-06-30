import { Router } from 'express';
import { verifyToken, getNextQuestion, submitAnswer, completeExam } from '../controllers/exams.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/verify-token', authenticateToken, verifyToken);
router.get('/session/:sessionId/next-question', authenticateToken, getNextQuestion);
router.post('/session/:sessionId/submit-answer', authenticateToken, submitAnswer);
router.post('/session/:sessionId/complete', authenticateToken, completeExam);

export default router;
