import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'sepia']).optional(),
  fontSize: z.number().min(12).max(24).optional(),
  aiModel: z.enum(['gpt-4', 'claude']).optional(),
  ttsVoice: z.string().optional(),
  paneRatio: z.number().min(0.3).max(0.8).optional()
});

// Get user settings
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const settings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Create default settings
      const newSettings = await prisma.userSettings.create({
        data: { userId }
      });
      return res.json({ status: 'success', data: { settings: newSettings } });
    }

    res.json({ status: 'success', data: { settings } });
  } catch (error) {
    next(error);
  }
});

// Update user settings
router.patch('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const updates = settingsSchema.parse(req.body);

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...updates },
      update: updates
    });

    res.json({ status: 'success', data: { settings } });
  } catch (error) {
    next(error);
  }
});

export { router as settingsRouter };
