import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export const redeemBenefit = async (req: AuthRequest, res: Response) => {
  try {
    const { benefitId } = req.params;
    const userId = req.user!.id;

    // Get user and benefit
    const [user, benefit] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
      }),
      prisma.benefit.findUnique({
        where: { id: benefitId },
      }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!benefit) {
      return res.status(404).json({ error: 'Benefit not found' });
    }

    // Check if benefit is active
    if (!benefit.isActive) {
      return res.status(400).json({ error: 'Benefit is not active' });
    }

    // Check validity dates
    const now = new Date();
    if (benefit.validFrom && benefit.validFrom > now) {
      return res.status(400).json({ error: 'Benefit is not yet valid' });
    }
    if (benefit.validUntil && benefit.validUntil < now) {
      return res.status(400).json({ error: 'Benefit has expired' });
    }

    // Check max uses
    if (benefit.maxUses !== null && benefit.currentUses >= benefit.maxUses) {
      return res.status(400).json({ error: 'Benefit has reached maximum uses' });
    }

    // Check if user has enough points
    if (user.availablePoints < benefit.costPoints) {
      return res.status(400).json({ error: 'Not enough points' });
    }

    // Check if user already redeemed this benefit today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRedemption = await prisma.userRedemption.findFirst({
      where: {
        userId,
        benefitId,
        redeemedAt: { gte: today },
      },
    });

    if (todayRedemption) {
      return res.status(400).json({ error: 'Already redeemed this benefit today' });
    }

    // Create redemption and update user points in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create redemption
      const redemption = await tx.userRedemption.create({
        data: {
          userId,
          benefitId,
          pointsUsed: benefit.costPoints,
          status: 'pending',
        },
      });

      // Deduct points from user
      await tx.user.update({
        where: { id: userId },
        data: {
          availablePoints: { decrement: benefit.costPoints },
        },
      });

      // Increment benefit uses
      await tx.benefit.update({
        where: { id: benefitId },
        data: {
          currentUses: { increment: 1 },
        },
      });

      return redemption;
    });

    logger.info('Benefit redeemed successfully', { redemptionId: result.id, userId, benefitId });

    return res.json({
      redemptionId: result.id,
      status: 'pending',
      message: 'הבקשה התקבלה וממתינה לאישור מנהל',
    });
  } catch (error) {
    logger.error('Error redeeming benefit', { error });
    return res.status(500).json({ error: 'Failed to redeem benefit' });
  }
};

export const getMyRedemptions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const redemptions = await prisma.userRedemption.findMany({
      where: { userId },
      include: {
        benefit: true,
      },
      orderBy: { redeemedAt: 'desc' },
    });

    return res.json(
      redemptions.map((r) => ({
        id: r.id,
        benefit: {
          id: r.benefit.id,
          title: r.benefit.title,
          description: r.benefit.description,
          costPoints: r.benefit.costPoints,
        },
        pointsUsed: r.pointsUsed,
        status: r.status,
        redeemedAt: r.redeemedAt,
        processedAt: r.processedAt,
        notes: r.notes,
      }))
    );
  } catch (error) {
    logger.error('Error getting my redemptions', { error });
    return res.status(500).json({ error: 'Failed to get redemptions' });
  }
};

export const getAllRedemptions = async (req: AuthRequest, res: Response) => {
  try {
    const { status, userId, benefitId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (benefitId) where.benefitId = benefitId;

    const redemptions = await prisma.userRedemption.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            fullName: true,
          },
        },
        benefit: true,
      },
      orderBy: { redeemedAt: 'desc' },
    });

    return res.json(
      redemptions.map((r) => ({
        id: r.id,
        user: r.user,
        benefit: {
          id: r.benefit.id,
          title: r.benefit.title,
          costPoints: r.benefit.costPoints,
        },
        pointsUsed: r.pointsUsed,
        status: r.status,
        redeemedAt: r.redeemedAt,
        processedAt: r.processedAt,
        notes: r.notes,
      }))
    );
  } catch (error) {
    logger.error('Error getting all redemptions', { error });
    return res.status(500).json({ error: 'Failed to get redemptions' });
  }
};

export const processRedemption = async (req: AuthRequest, res: Response) => {
  try {
    const { redemptionId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user!.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected' });
    }

    const redemption = await prisma.userRedemption.findUnique({
      where: { id: redemptionId },
      include: { user: true, benefit: true },
    });

    if (!redemption) {
      return res.status(404).json({ error: 'Redemption not found' });
    }

    if (redemption.status !== 'pending') {
      return res.status(400).json({ error: 'Redemption already processed' });
    }

    // Process in transaction
    await prisma.$transaction(async (tx) => {
      if (status === 'rejected') {
        // Return points to user
        await tx.user.update({
          where: { id: redemption.userId },
          data: {
            availablePoints: { increment: redemption.pointsUsed },
          },
        });

        // Decrement benefit uses
        await tx.benefit.update({
          where: { id: redemption.benefitId },
          data: {
            currentUses: { decrement: 1 },
          },
        });
      }

      // Update redemption
      await tx.userRedemption.update({
        where: { id: redemptionId },
        data: {
          status,
          notes,
          processedAt: new Date(),
          processedBy: adminId,
        },
      });
    });

    logger.info('Redemption processed', { redemptionId, status, adminId });

    return res.json({ message: `Redemption ${status} successfully` });
  } catch (error) {
    logger.error('Error processing redemption', { error });
    return res.status(500).json({ error: 'Failed to process redemption' });
  }
};
