import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { audioQueue } from '../services/audioQueue';
import { storageService } from '../services/storage';

const router = Router();

const generateSchema = z.object({
  documentId: z.string(),
  text: z.string().max(50000),
  pageStart: z.number().optional(),
  pageEnd: z.number().optional(),
  chapterIndex: z.number().optional()
});

// Generate audio from text
router.post('/generate', async (req, res, next) => {
  try {
    const params = generateSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: { id: params.documentId, userId }
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // Get user settings for voice preference
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true }
    });

    const voiceId = user?.settings?.ttsVoice || '21m00Tcm4TlvDq8ikWAM';

    // Create audio job
    const job = await prisma.audioJob.create({
      data: {
        documentId: params.documentId,
        userId,
        textContent: params.text,
        voiceId,
        pageStart: params.pageStart,
        pageEnd: params.pageEnd,
        chapterIndex: params.chapterIndex,
        status: 'PENDING'
      }
    });

    // Add to queue
    await audioQueue.add('generate-audio', {
      jobId: job.id,
      text: params.text,
      voiceId,
      userId
    });

    res.status(202).json({
      status: 'success',
      data: { jobId: job.id, status: 'PENDING' }
    });
  } catch (error) {
    next(error);
  }
});

// Get audio job status
router.get('/status/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.id;

    const job = await prisma.audioJob.findFirst({
      where: { id: jobId, userId }
    });

    if (!job) {
      throw new AppError(404, 'Audio job not found');
    }

    let url = null;
    if (job.storageKey && job.status === 'COMPLETED') {
      url = await storageService.getSignedUrl(job.storageKey, 3600);
    }

    res.json({
      status: 'success',
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.status === 'PROCESSING' ? 50 : job.status === 'COMPLETED' ? 100 : 0,
        url,
        duration: job.duration,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// List audio jobs for document
router.get('/document/:documentId', async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.id;

    const jobs = await prisma.audioJob.findMany({
      where: { documentId, userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      data: { jobs }
    });
  } catch (error) {
    next(error);
  }
});

// Delete audio job
router.delete('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.id;

    const job = await prisma.audioJob.findFirst({
      where: { id: jobId, userId }
    });

    if (!job) {
      throw new AppError(404, 'Audio job not found');
    }

    if (job.storageKey) {
      await storageService.deleteFile(job.storageKey);
    }

    await prisma.audioJob.delete({ where: { id: jobId } });

    res.json({ status: 'success', message: 'Audio job deleted' });
  } catch (error) {
    next(error);
  }
});

export { router as audioRouter };
