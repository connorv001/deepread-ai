import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';

interface JwtPayload {
  userId: string;
  email: string;
}

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN: jwt.SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
const COOKIE_NAME = 'deepread_token';
const isProduction = process.env.NODE_ENV === 'production';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Helper to set auth cookie
const setAuthCookie = (res: any, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction, // Only HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};

// Helper to clear auth cookie
const clearAuthCookie = (res: any) => {
  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 0,
    path: '/'
  });
};

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        settings: { create: {} }
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set httpOnly cookie
    setAuthCookie(res, token);

    res.status(201).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set httpOnly cookie
    setAuthCookie(res, token);

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ status: 'success', message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    // Get token from httpOnly cookie directly (since auth routes don't use authMiddleware)
    const token = req.cookies?.[COOKIE_NAME];
    
    if (!token) {
      throw new AppError(401, 'Not authenticated');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        settings: true
      }
    });

    if (!user) {
      throw new AppError(401, 'User not found');
    }

    res.json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
});

// Check auth status (for frontend)
router.get('/check', (req, res) => {
  if (req.user) {
    res.json({ status: 'success', data: { authenticated: true, user: req.user } });
  } else {
    res.json({ status: 'success', data: { authenticated: false } });
  }
});

export { router as authRouter, setAuthCookie, clearAuthCookie };
