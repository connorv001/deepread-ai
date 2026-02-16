import { Router } from 'express';
import { prisma } from '../index';
import { storageService } from '../services/storage';

const router = Router();

// Get user's document library
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { search, sortBy = 'updatedAt', order = 'desc' } = req.query;

    const documents = await prisma.document.findMany({
      where: {
        userId,
        ...(search && {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { author: { contains: search as string, mode: 'insensitive' } }
          ]
        })
      },
      orderBy: { [sortBy as string]: order },
      select: {
        id: true,
        title: true,
        author: true,
        type: true,
        size: true,
        pageCount: true,
        progressPercent: true,
        lastReadAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      status: 'success',
      data: { documents, total: documents.length }
    });
  } catch (error) {
    next(error);
  }
});

// Get recent documents
router.get('/recent', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 5;

    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { lastReadAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        author: true,
        type: true,
        progressPercent: true,
        lastReadAt: true
      }
    });

    res.json({
      status: 'success',
      data: { documents }
    });
  } catch (error) {
    next(error);
  }
});

export { router as libraryRouter };
