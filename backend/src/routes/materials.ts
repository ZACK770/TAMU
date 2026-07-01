import { Router } from 'express';
import { getAllLessons, createLesson, updateLesson, deleteLesson, createMaterial, deleteMaterial } from '../controllers/materials.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/lessons', getAllLessons);
router.post('/lessons', authenticateToken, createLesson);
router.patch('/lessons/:id', authenticateToken, updateLesson);
router.delete('/lessons/:id', authenticateToken, deleteLesson);
router.post('/materials', authenticateToken, createMaterial);
router.delete('/materials/:id', authenticateToken, deleteMaterial);

export default router;
