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

export const updateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isRandom } = req.body;

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(typeof isRandom === 'boolean' && { isRandom }),
      },
      include: {
        questions: true,
        tokens: true,
      },
    });

    logger.info('Exam updated successfully', { examId: id });
    return res.json(exam);
  } catch (error: any) {
    logger.error('Error updating exam', { error: error.message });
    return res.status(500).json({ error: 'Failed to update exam' });
  }
};

export const addQuestion = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { text, answers, correctIdx } = req.body;

    if (!text || !Array.isArray(answers) || correctIdx === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const question = await prisma.question.create({
      data: {
        examId,
        text,
        answers,
        correctIdx,
      },
    });

    logger.info('Question created successfully', { examId, questionId: question.id });
    return res.json(question);
  } catch (error: any) {
    logger.error('Error creating question', { error: error.message });
    return res.status(500).json({ error: 'Failed to create question' });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;

    await prisma.question.delete({
      where: { id: questionId },
    });

    logger.info('Question deleted successfully', { questionId });
    return res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting question', { error: error.message });
    return res.status(500).json({ error: 'Failed to delete question' });
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
