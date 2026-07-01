import { Request, Response } from 'express';
import { createRequire } from 'module';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import QRCode from 'qrcode';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

export const createExam = async (req: Request, res: Response) => {
  try {
    const { title, questions, studyProgramId } = req.body;

    if (!title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        ...(studyProgramId && { studyProgramId }),
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
        tokens: true,
        rewardRules: { orderBy: { minScore: 'desc' } },
        benefits: true,
        studyProgram: true,
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
        rewardRules: { orderBy: { minScore: 'desc' } },
        benefits: true,
        studyProgram: true,
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
    const { isRandom, studyProgramId, rewardRules, benefits } = req.body;

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(typeof isRandom === 'boolean' && { isRandom }),
        ...(studyProgramId !== undefined && { studyProgramId: studyProgramId || null }),
        ...(Array.isArray(rewardRules) && {
          rewardRules: {
            deleteMany: {},
            create: rewardRules.map((rule: any) => ({
              minScore: Number(rule.minScore) || 0,
              points: Number(rule.points) || 0,
            })),
          },
        }),
        ...(Array.isArray(benefits) && {
          benefits: {
            deleteMany: {},
            create: benefits.map((benefit: any) => ({
              title: benefit.title,
              description: benefit.description || null,
              costPoints: Number(benefit.costPoints) || 0,
            })).filter((benefit: any) => benefit.title),
          },
        }),
      },
      include: {
        questions: true,
        tokens: true,
        rewardRules: { orderBy: { minScore: 'desc' } },
        benefits: true,
        studyProgram: true,
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

export const createBulkTokens = async (req: Request, res: Response) => {
  try {
    const { examId, count } = req.body;

    if (!examId || !count || count < 1 || count > 100) {
      return res.status(400).json({ error: 'examId and count (1-100) are required' });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const tokens = [];
    for (let i = 0; i < count; i++) {
      const tokenCode = Math.floor(100000 + Math.random() * 900000).toString();
      const examToken = await prisma.examToken.create({
        data: {
          tokenCode,
          examId,
        },
      });
      tokens.push(examToken);
    }

    logger.info('Bulk tokens created successfully', { examId, count });
    return res.json(tokens);
  } catch (error: any) {
    logger.error('Error creating bulk tokens', { error: error.message });
    return res.status(500).json({ error: 'Failed to create bulk tokens' });
  }
};

export const generateTokenQR = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;

    const token = await prisma.examToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const qrCodeDataURL = await QRCode.toDataURL(token.tokenCode, {
      width: 300,
      margin: 2,
    });

    // Remove data URL prefix to get base64 data
    const base64Data = qrCodeDataURL.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="token-${token.tokenCode}.png"`,
    });

    return res.send(buffer);
  } catch (error: any) {
    logger.error('Error generating QR code', { error: error.message });
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

export const downloadAllQRCodes = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { tokens: true },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (!exam.tokens || exam.tokens.length === 0) {
      return res.status(400).json({ error: 'No tokens found for this exam' });
    }

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="qrcodes-${exam.title.replace(/[^a-z0-9]/gi, '-')}.zip"`,
    });

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.pipe(res);

    for (const token of exam.tokens) {
      const qrCodeDataURL = await QRCode.toDataURL(token.tokenCode, {
        width: 300,
        margin: 2,
      });
      const base64Data = qrCodeDataURL.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      archive.append(buffer, { name: `token-${token.tokenCode}.png` });
    }

    await archive.finalize();

    logger.info('All QR codes downloaded successfully', { examId });
    return;
  } catch (error: any) {
    logger.error('Error downloading all QR codes', { error: error.message });
    return res.status(500).json({ error: 'Failed to download all QR codes' });
  }
};
