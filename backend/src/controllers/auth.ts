import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { yemotService } from '../services/yemot.js';
import logger from '../utils/logger.js';

const otpCodes = new Map<string, { code: string; expiresAt: number }>();

export const sendCode = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate phone format (Israeli format)
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Generate 6-digit OTP code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpCodes.set(phone, { code, expiresAt });

    // Send SMS via Yemot
    const message = `קוד האימות שלך הוא: ${code}`;
    const smsSent = await yemotService.sendSMS(phone, message);

    if (!smsSent) {
      // Fallback to voice call if SMS fails
      logger.warn('SMS failed, trying voice call', { phone });
      await yemotService.makeCall(phone, `קוד האימות שלך הוא. ${code.split('').join('. ')}`);
    }

    logger.info('OTP code sent', { phone });

    return res.json({ 
      message: 'Code sent successfully',
      expiresIn: 600 // 10 minutes in seconds
    });
  } catch (error) {
    logger.error('Error sending code', { error });
    return res.status(500).json({ error: 'Failed to send code' });
  }
};

export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code are required' });
    }

    const storedOtp = otpCodes.get(phone);

    if (!storedOtp) {
      logger.warn('OTP not found or expired', { phone });
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    if (Date.now() > storedOtp.expiresAt) {
      otpCodes.delete(phone);
      logger.warn('OTP expired', { phone });
      return res.status(400).json({ error: 'Code expired' });
    }

    if (storedOtp.code !== code) {
      logger.warn('Invalid OTP attempt', { phone });
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      // New user - return flag to indicate registration needed
      otpCodes.delete(phone);
      logger.info('New user needs registration', { phone });
      return res.json({ 
        needsRegistration: true,
        phone 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.JWT_SECRET || '',
      { expiresIn: '7d' }
    );

    otpCodes.delete(phone);
    logger.info('User authenticated successfully', { userId: user.id, phone });

    return res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    logger.error('Error verifying code', { error });
    return res.status(500).json({ error: 'Failed to verify code' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { phone, fullName } = req.body;

    if (!phone || !fullName) {
      return res.status(400).json({ error: 'Phone and full name are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        phone,
        fullName,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.JWT_SECRET || '',
      { expiresIn: '7d' }
    );

    logger.info('New user registered', { userId: user.id, phone });

    return res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    logger.error('Error registering user', { error });
    return res.status(500).json({ error: 'Failed to register user' });
  }
};
