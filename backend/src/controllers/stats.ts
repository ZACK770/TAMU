import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's exam sessions
    const sessions = await prisma.examSession.findMany({
      where: { userId, isCompleted: true },
      include: { exam: true },
    });

    // Get user's redemptions
    const redemptions = await prisma.userRedemption.findMany({
      where: { userId },
      include: { benefit: true },
    });

    // Calculate stats
    const totalExams = sessions.length;
    const scores = sessions.map((s) => s.score).filter((s): s is number => s !== null);
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
    const totalPoints = sessions.reduce((sum, s) => sum + s.earnedPoints, 0);
    const totalRedemptions = redemptions.length;
    const pointsSpent = redemptions.reduce((sum, r) => sum + r.pointsUsed, 0);

    // Get recent activity (last 10 items)
    const recentExams = sessions.slice(0, 5).map((s) => ({
      type: 'exam' as const,
      title: s.exam.title,
      date: s.completedAt || s.startedAt,
      points: s.earnedPoints,
    }));

    const recentRedemptions = redemptions.slice(0, 5).map((r) => ({
      type: 'redemption' as const,
      title: r.benefit.title,
      date: r.redeemedAt,
      points: -r.pointsUsed,
    }));

    const recentActivity = [...recentExams, ...recentRedemptions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return res.json({
      totalExams,
      averageScore,
      bestScore,
      worstScore,
      totalPoints,
      totalRedemptions,
      pointsSpent,
      recentActivity,
    });
  } catch (error) {
    logger.error('Error getting my stats', { error });
    return res.status(500).json({ error: 'Failed to get stats' });
  }
};

export const getAdminStats = async (_req: AuthRequest, res: Response) => {
  try {
    // Get total users
    const totalUsers = await prisma.user.count();

    // Get total exams completed
    const totalExams = await prisma.examSession.count({
      where: { isCompleted: true },
    });

    // Get total redemptions
    const totalRedemptions = await prisma.userRedemption.count();

    // Get total points distributed
    const pointsDistributed = await prisma.examSession.aggregate({
      where: { isCompleted: true },
      _sum: { earnedPoints: true },
    });

    // Get total points spent
    const pointsSpent = await prisma.userRedemption.aggregate({
      _sum: { pointsUsed: true },
    });

    // Get popular benefits
    const popularBenefits = await prisma.userRedemption.groupBy({
      by: ['benefitId'],
      _count: { benefitId: true },
      orderBy: { _count: { benefitId: 'desc' } },
      take: 5,
    });

    const benefitDetails = await Promise.all(
      popularBenefits.map(async (b) => {
        const benefit = await prisma.benefit.findUnique({
          where: { id: b.benefitId },
          select: { id: true, title: true },
        });
        return {
          benefitId: b.benefitId,
          title: benefit?.title || 'Unknown',
          redemptionCount: b._count.benefitId,
        };
      })
    );

    // Get top users
    const topUsers = await prisma.user.findMany({
      orderBy: { totalPoints: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        phone: true,
        totalPoints: true,
      },
    });

    return res.json({
      totalUsers,
      totalExams,
      totalRedemptions,
      totalPointsDistributed: pointsDistributed._sum.earnedPoints || 0,
      totalPointsSpent: pointsSpent._sum.pointsUsed || 0,
      popularBenefits: benefitDetails,
      topUsers,
    });
  } catch (error) {
    logger.error('Error getting admin stats', { error });
    return res.status(500).json({ error: 'Failed to get admin stats' });
  }
};
