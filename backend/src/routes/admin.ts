import { Router } from 'express';
import { createExam, createToken, getAllExams, updateExam, addQuestion, deleteQuestion, deleteExam, createBulkTokens, generateTokenQR, downloadAllQRCodes, updateExamAllowedBenefits } from '../controllers/admin.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication
router.post('/exams', authenticateToken, createExam);
router.get('/exams', authenticateToken, getAllExams);
router.patch('/exams/:id', authenticateToken, updateExam);
router.patch('/exams/:id/allowed-benefits', authenticateToken, updateExamAllowedBenefits);
router.delete('/exams/:id', authenticateToken, deleteExam);
router.post('/exams/:examId/questions', authenticateToken, addQuestion);
router.delete('/questions/:questionId', authenticateToken, deleteQuestion);
router.post('/tokens', authenticateToken, createToken);
router.post('/tokens/bulk', authenticateToken, createBulkTokens);
router.get('/tokens/:tokenId/qr', authenticateToken, generateTokenQR);
router.get('/exams/:examId/qrs', authenticateToken, downloadAllQRCodes);

export default router;
