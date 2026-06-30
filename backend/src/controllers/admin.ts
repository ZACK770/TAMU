import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export const createExam = async (req: Request, res: Response) => {
  try {
    const { title, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        questions: {
          create: questions.map((q: any) => ({
            text: q.text,
            answers: q.answers,
            correctIdx: q.correctIdx,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    logger.info('Exam created successfully', { examId: exam.id, title });
    return res.json(exam);
  } catch (error: any) {
    logger.error('Error creating exam', { error: error.message });
    return res.status(500).json({ error: 'Failed to create exam' });
  }
};

export const createToken = async (req: Request, res: Response) => {
  try {
    const { examId } = req.body;

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
    const tokenCode = Math.floor(100000 + Math.random() * 900000).toString();

    const examToken = await prisma.examToken.create({
      data: {
        tokenCode,
        examId,
      },
    });

    logger.info('Token created successfully', { tokenId: examToken.id, tokenCode });
    return res.json(examToken);
  } catch (error: any) {
    logger.error('Error creating token', { error: error.message });
    return res.status(500).json({ error: 'Failed to create token' });
  }
};

export const getAllExams = async (_req: Request, res: Response) => {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        questions: true,
        tokens: true,
      },
    });

    return res.json(exams);
  } catch (error: any) {
    logger.error('Error fetching exams', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch exams' });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.exam.delete({
      where: { id },
    });

    logger.info('Exam deleted successfully', { examId: id });
    return res.json({ message: 'Exam deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting exam', { error: error.message });
    return res.status(500).json({ error: 'Failed to delete exam' });
  }
};
