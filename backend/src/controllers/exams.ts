import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export const verifyToken = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    const userId = req.user!.id;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find the exam token
    const examToken = await prisma.examToken.findUnique({
      where: { tokenCode: token },
    });

    if (!examToken) {
      logger.warn('Invalid exam token', { userId, token });
      return res.status(400).json({ error: 'Invalid token' });
    }

    if (examToken.isUsed) {
      logger.warn('Token already used', { userId, token });
      return res.status(400).json({ error: 'Token already used' });
    }

    // Get exam details
    const exam = await prisma.exam.findUnique({
      where: { id: examToken.examId },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Create new exam session
    const session = await prisma.examSession.create({
      data: {
        userId,
        examId: examToken.examId,
        answers: {},
      },
    });

    logger.info('Exam session created', { sessionId: session.id, userId, examId: examToken.examId });

    return res.json({
      sessionId: session.id,
      exam: {
        id: exam.id,
        title: exam.title,
        isRandom: exam.isRandom,
      },
    });
  } catch (error) {
    logger.error('Error verifying token', { error });
    return res.status(500).json({ error: 'Failed to verify token' });
  }
};

export const getNextQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    // Get session
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (session.isCompleted) {
      return res.status(400).json({ error: 'Exam already completed' });
    }

    // Get exam with questions
    const exam = await prisma.exam.findUnique({
      where: { id: session.examId },
      include: { questions: true },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Get answered question IDs
    const answers = session.answers as Record<string, number>;
    const answeredQuestionIds = Object.keys(answers);

    // Get next question
    let questions = exam.questions;
    
    if (exam.isRandom) {
      // Shuffle questions
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    const nextQuestion = questions.find((q: any) => !answeredQuestionIds.includes(q.id));

    if (!nextQuestion) {
      // No more questions
      return res.json({ completed: true });
    }

    return res.json({
      question: {
        id: nextQuestion.id,
        text: nextQuestion.text,
        answers: nextQuestion.answers,
      },
    });
  } catch (error) {
    logger.error('Error getting next question', { error });
    return res.status(500).json({ error: 'Failed to get next question' });
  }
};

export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { questionId, answerIndex } = req.body;
    const userId = req.user!.id;

    if (!questionId || answerIndex === undefined) {
      return res.status(400).json({ error: 'Question ID and answer index are required' });
    }

    // Get session
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (session.isCompleted) {
      return res.status(400).json({ error: 'Exam already completed' });
    }

    // Get question to validate answer
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Update answers
    const answers = session.answers as Record<string, number>;
    answers[questionId] = answerIndex;

    await prisma.examSession.update({
      where: { id: sessionId },
      data: { answers },
    });

    const isCorrect = answerIndex === question.correctIdx;

    logger.info('Answer submitted', { sessionId, questionId, isCorrect, userId });

    return res.json({
      correct: isCorrect,
    });
  } catch (error) {
    logger.error('Error submitting answer', { error });
    return res.status(500).json({ error: 'Failed to submit answer' });
  }
};

export const completeExam = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    // Get session
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (session.isCompleted) {
      return res.status(400).json({ error: 'Exam already completed' });
    }

    // Get exam with questions
    const exam = await prisma.exam.findUnique({
      where: { id: session.examId },
      include: { questions: true },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Calculate score
    const answers = session.answers as Record<string, number>;
    let correctCount = 0;

    for (const question of exam.questions) {
      if (answers[question.id] === question.correctIdx) {
        correctCount++;
      }
    }

    const score = Math.round((correctCount / exam.questions.length) * 100);

    // Update session
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        score,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Mark token as used
    await prisma.examToken.updateMany({
      where: { examId: session.examId, usedById: userId },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    logger.info('Exam completed', { sessionId, score, userId });

    return res.json({
      score,
      correctCount,
      totalQuestions: exam.questions.length,
    });
  } catch (error) {
    logger.error('Error completing exam', { error });
    return res.status(500).json({ error: 'Failed to complete exam' });
  }
};
