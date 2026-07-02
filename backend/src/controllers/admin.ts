import { Request, Response } from 'express';
import { createRequire } from 'module';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import QRCode from 'qrcode';

const require = createRequire(import.meta.url);
const archiver = require('archiver');
const APP_BASE_URL = 'https://tamu-6suv.onrender.com';
const buildExamUrl = (tokenCode: string) => `${APP_BASE_URL}/exam?token=${encodeURIComponent(tokenCode)}`;

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
        tokens: { orderBy: { id: 'desc' } },
        rewardRules: { orderBy: { minScore: 'desc' } },
        benefits: true,
        allowedBenefits: {
          include: {
            benefit: {
              select: {
                id: true,
                title: true,
                costPoints: true,
              },
            },
          },
        },
        sessions: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
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
        tokens: { orderBy: { id: 'desc' } },
        rewardRules: { orderBy: { minScore: 'desc' } },
        benefits: true,
        allowedBenefits: {
          include: {
            benefit: {
              select: {
                id: true,
                title: true,
                costPoints: true,
              },
            },
          },
        },
        sessions: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
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
        tokens: { orderBy: { id: 'desc' } },
        rewardRules: { orderBy: { minScore: 'desc' } },
        benefits: true,
        allowedBenefits: {
          include: {
            benefit: {
              select: {
                id: true,
                title: true,
                costPoints: true,
              },
            },
          },
        },
        sessions: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
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

    const qrCodeDataURL = await QRCode.toDataURL(buildExamUrl(token.tokenCode), {
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
      const qrCodeDataURL = await QRCode.toDataURL(buildExamUrl(token.tokenCode), {
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

export const updateExamAllowedBenefits = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { benefitIds } = req.body;

    if (!Array.isArray(benefitIds)) {
      return res.status(400).json({ error: 'benefitIds must be an array' });
    }

    // Delete all existing allowed benefits for this exam
    await prisma.examAllowedBenefit.deleteMany({
      where: { examId: id },
    });

    // Create new allowed benefits
    if (benefitIds.length > 0) {
      await prisma.examAllowedBenefit.createMany({
        data: benefitIds.map((benefitId: string) => ({
          examId: id,
          benefitId,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch updated exam with all relations
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: true,
        tokens: { orderBy: { id: 'desc' } },
        rewardRules: { orderBy: { minScore: 'desc' } },
        benefits: true,
        allowedBenefits: {
          include: {
            benefit: {
              select: {
                id: true,
                title: true,
                costPoints: true,
              },
            },
          },
        },
        sessions: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
        studyProgram: true,
      },
    });

    logger.info('Exam allowed benefits updated successfully', { examId: id, benefitIds });
    return res.json(exam);
  } catch (error: any) {
    logger.error('Error updating exam allowed benefits', { error: error.message });
    return res.status(500).json({ error: 'Failed to update exam allowed benefits' });
  }
};

// Student Management Functions

export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const { search, status, minPoints, maxPoints, page = 1, limit = 50 } = req.query;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
      ];
    }
    
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'blocked') {
      where.isActive = false;
    }
    
    if (minPoints || maxPoints) {
      where.availablePoints = {};
      if (minPoints) where.availablePoints.gte = parseInt(minPoints as string);
      if (maxPoints) where.availablePoints.lte = parseInt(maxPoints as string);
    }
    
    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              examSessions: true,
              redemptions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ]);
    
    return res.json({
      students,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (error: any) {
    logger.error('Error fetching students', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
};

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const student = await prisma.user.findUnique({
      where: { id },
      include: {
        examSessions: {
          include: {
            exam: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
        redemptions: {
          include: {
            benefit: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { redeemedAt: 'desc' },
        },
        pointHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    return res.json(student);
  } catch (error: any) {
    logger.error('Error fetching student', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch student' });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, adminNotes } = req.body;
    
    const student = await prisma.user.update({
      where: { id },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(adminNotes !== undefined && { adminNotes }),
      },
    });
    
    logger.info('Student updated successfully', { studentId: id });
    return res.json(student);
  } catch (error: any) {
    logger.error('Error updating student', { error: error.message });
    return res.status(500).json({ error: 'Failed to update student' });
  }
};

export const blockStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    
    const student = await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        blockedAt: new Date(),
        blockedBy: adminId,
      },
    });
    
    logger.info('Student blocked successfully', { studentId: id, adminId });
    return res.json(student);
  } catch (error: any) {
    logger.error('Error blocking student', { error: error.message });
    return res.status(500).json({ error: 'Failed to block student' });
  }
};

export const unblockStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const student = await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        blockedAt: null,
        blockedBy: null,
      },
    });
    
    logger.info('Student unblocked successfully', { studentId: id });
    return res.json(student);
  } catch (error: any) {
    logger.error('Error unblocking student', { error: error.message });
    return res.status(500).json({ error: 'Failed to unblock student' });
  }
};

export const adjustStudentPoints = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, amount, reason, description } = req.body;
    const adminId = req.user?.id;
    
    if (!type || !amount || !reason) {
      return res.status(400).json({ error: 'Missing required fields: type, amount, reason' });
    }
    
    if (!['manual_add', 'manual_subtract'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be manual_add or manual_subtract' });
    }
    
    const student = await prisma.user.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Update points
    const pointChange = type === 'manual_add' ? amount : -amount;
    const updatedStudent = await prisma.user.update({
      where: { id },
      data: {
        totalPoints: { increment: pointChange },
        availablePoints: { increment: pointChange },
      },
    });
    
    // Record in history
    await prisma.pointHistory.create({
      data: {
        userId: id,
        type,
        amount: pointChange,
        reason,
        description,
        createdBy: adminId,
      },
    });
    
    logger.info('Student points adjusted successfully', { studentId: id, type, amount, adminId });
    return res.json(updatedStudent);
  } catch (error: any) {
    logger.error('Error adjusting student points', { error: error.message });
    return res.status(500).json({ error: 'Failed to adjust student points' });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.user.delete({
      where: { id },
    });
    
    logger.info('Student deleted successfully', { studentId: id });
    return res.json({ message: 'Student deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting student', { error: error.message });
    return res.status(500).json({ error: 'Failed to delete student' });
  }
};
