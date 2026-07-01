import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export const getAllLessons = async (_req: AuthRequest, res: Response) => {
  try {
    const lessons = await prisma.lesson.findMany({
      include: {
        materials: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return res.json(lessons);
  } catch (error: any) {
    logger.error('Error fetching lessons', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, videoUrl, audioUrl, order } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        description,
        videoUrl,
        audioUrl,
        order: order || 0,
      },
      include: {
        materials: true,
      },
    });

    logger.info('Lesson created successfully', { lessonId: lesson.id, title });
    return res.json(lesson);
  } catch (error: any) {
    logger.error('Error creating lesson', { error: error.message });
    return res.status(500).json({ error: 'Failed to create lesson' });
  }
};

export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, videoUrl, audioUrl, order } = req.body;

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(audioUrl !== undefined && { audioUrl }),
        ...(order !== undefined && { order }),
      },
      include: {
        materials: true,
      },
    });

    logger.info('Lesson updated successfully', { lessonId: id });
    return res.json(lesson);
  } catch (error: any) {
    logger.error('Error updating lesson', { error: error.message });
    return res.status(500).json({ error: 'Failed to update lesson' });
  }
};

export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.lesson.delete({
      where: { id },
    });

    logger.info('Lesson deleted successfully', { lessonId: id });
    return res.json({ message: 'Lesson deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting lesson', { error: error.message });
    return res.status(500).json({ error: 'Failed to delete lesson' });
  }
};

export const createMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { title, fileUrl, fileType, fileSize, lessonId } = req.body;

    if (!title || !fileUrl || !fileType) {
      return res.status(400).json({ error: 'Title, fileUrl, and fileType are required' });
    }

    const material = await prisma.material.create({
      data: {
        title,
        fileUrl,
        fileType,
        fileSize: fileSize || 0,
        lessonId,
      },
    });

    logger.info('Material created successfully', { materialId: material.id, title });
    return res.json(material);
  } catch (error: any) {
    logger.error('Error creating material', { error: error.message });
    return res.status(500).json({ error: 'Failed to create material' });
  }
};

export const deleteMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.material.delete({
      where: { id },
    });

    logger.info('Material deleted successfully', { materialId: id });
    return res.json({ message: 'Material deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting material', { error: error.message });
    return res.status(500).json({ error: 'Failed to delete material' });
  }
};
