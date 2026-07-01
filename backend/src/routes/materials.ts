import { Router } from 'express';
import { getStudyPrograms, createStudyProgram, updateStudyProgram, deleteStudyProgram, getAllLessons, createLesson, updateLesson, deleteLesson, createMaterial, deleteMaterial } from '../controllers/materials.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/study-programs', getStudyPrograms);
router.post('/study-programs', authenticateToken, createStudyProgram);
router.patch('/study-programs/:id', authenticateToken, updateStudyProgram);
router.delete('/study-programs/:id', authenticateToken, deleteStudyProgram);
router.get('/lessons', getAllLessons);
router.post('/lessons', authenticateToken, createLesson);
router.patch('/lessons/:id', authenticateToken, updateLesson);
router.delete('/lessons/:id', authenticateToken, deleteLesson);
router.post('/materials', authenticateToken, createMaterial);
router.delete('/materials/:id', authenticateToken, deleteMaterial);

export default router;
