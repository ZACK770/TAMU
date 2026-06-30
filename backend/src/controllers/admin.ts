import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export const createExam = async (req: Request, res: Response) => {
  try {
    const { title, description, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || '',
        questions: {
          create: questions.map((q: any) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    logger.info('Exam created successfully', { examId: exam.id, title });
    res.json(exam);
  } catch (error: any) {
    logger.error('Error creating exam', { error: error.message });
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

export const createToken = async (req: Request, res: Response) => {
  try {
    const { examId, maxAttempts = 1 } = req.body;

    if (!examId) {
      return res.status(400).json({ error: 'examId is required' });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Generate a random 6-digit token
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    const examToken = await prisma.examToken.create({
      data: {
        token,
        examId,
        maxAttempts,
        isActive: true,
      },
    });

    logger.info('Token created successfully', { tokenId: examToken.id, token });
    res.json(examToken);
  } catch (error: any) {
    logger.error('Error creating token', { error: error.message });
    res.status(500).json({ error: 'Failed to create token' });
  }
};

export const getAllExams = async (req: Request, res: Response) => {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        questions: true,
        tokens: true,
      },
    });

    res.json(exams);
  } catch (error: any) {
    logger.error('Error fetching exams', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.exam.delete({
      where: { id },
    });

    logger.info('Exam deleted successfully', { examId: id });
    res.json({ message: 'Exam deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting exam', { error: error.message });
    res.status(500).json({ error: 'Failed to delete exam' });
  }
};
