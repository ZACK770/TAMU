import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export interface AuthRequest extends Request {
  user?: { id: string; phone: string };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Authentication failed: No token provided', { path: req.path });
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as { id: string; phone: string };
    req.user = decoded;
    
    logger.info('User authenticated', { userId: decoded.id, path: req.path });
    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', { path: req.path });
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
