import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export const getAvailableBenefits = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's available points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { availablePoints: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all active benefits
    const benefits = await prisma.benefit.findMany({
      where: {
        isActive: true,
        OR: [
          { validFrom: null },
          { validFrom: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const benefitsWithStatus = benefits.map((benefit) => {
      const canRedeem = 
        user.availablePoints >= benefit.costPoints &&
        (benefit.maxUses === null || benefit.currentUses < benefit.maxUses);

      let reason: string | undefined;
      if (!canRedeem) {
        if (user.availablePoints < benefit.costPoints) {
          reason = 'אין מספיק נקודות';
        } else if (benefit.maxUses !== null && benefit.currentUses >= benefit.maxUses) {
          reason = 'ההטבה אזלה';
        }
      }

      return {
        id: benefit.id,
        title: benefit.title,
        description: benefit.description,
        costPoints: benefit.costPoints,
        category: benefit.category,
        imageUrl: benefit.imageUrl,
        canRedeem,
        reason,
      };
    });

    return res.json(benefitsWithStatus);
  } catch (error) {
    logger.error('Error getting available benefits', { error });
    return res.status(500).json({ error: 'Failed to get available benefits' });
  }
};

export const createBenefit = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, costPoints, category, imageUrl, maxUses, validFrom, validUntil } = req.body;

    if (!title || !costPoints) {
      return res.status(400).json({ error: 'title and costPoints are required' });
    }

    const benefit = await prisma.benefit.create({
      data: {
        title,
        description,
        costPoints: Number(costPoints),
        category,
        imageUrl,
        maxUses: maxUses ? Number(maxUses) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    logger.info('Benefit created successfully', { benefitId: benefit.id, title });
    return res.json(benefit);
  } catch (error) {
    logger.error('Error creating benefit', { error });
    return res.status(500).json({ error: 'Failed to create benefit' });
  }
};

export const updateBenefit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, costPoints, category, imageUrl, maxUses, validFrom, validUntil, isActive } = req.body;

    const benefit = await prisma.benefit.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(costPoints && { costPoints: Number(costPoints) }),
        ...(category !== undefined && { category }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(maxUses !== undefined && { maxUses: maxUses ? Number(maxUses) : null }),
        ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : null }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    logger.info('Benefit updated successfully', { benefitId: id });
    return res.json(benefit);
  } catch (error) {
    logger.error('Error updating benefit', { error });
    return res.status(500).json({ error: 'Failed to update benefit' });
  }
};

export const deleteBenefit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.benefit.delete({
      where: { id },
    });

    logger.info('Benefit deleted successfully', { benefitId: id });
    return res.json({ message: 'Benefit deleted successfully' });
  } catch (error) {
    logger.error('Error deleting benefit', { error });
    return res.status(500).json({ error: 'Failed to delete benefit' });
  }
};

export const getAllBenefits = async (_req: AuthRequest, res: Response) => {
  try {
    const benefits = await prisma.benefit.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json(benefits);
  } catch (error) {
    logger.error('Error getting all benefits', { error });
    return res.status(500).json({ error: 'Failed to get all benefits' });
  }
};
