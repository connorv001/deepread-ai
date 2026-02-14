import { Router } from 'express';
import { prisma, redis } from '../index';
import { AppError } from '../middleware/errorHandler';
import { storageService } from '../services/storage';
import { documentProcessor } from '../services/documentProcessor';

const router = Router();

// Upload document
router.post('/upload', async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      throw new AppError(400, 'No file uploaded');
    }

    const file = req.files.file as any;
    const userId = req.user!.id;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/epub+zip'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new AppError(400, 'Invalid file type. Only PDF and EPUB are supported');
    }

    // Generate storage key
    const storageKey = `${userId}/${Date.now()}-${file.name}`;

    // Upload to storage
    await storageService.uploadFile(storageKey, file.tempFilePath, file.mimetype);

    // Process document to extract metadata
    const metadata = await documentProcessor.extractMetadata(file.tempFilePath, file.mimetype);

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
        author: metadata.author,
        filename: file.name,
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
        type: file.mimetype === 'application/pdf' ? 'PDF' : 'EPUB',
        pageCount: metadata.pageCount,
        metadata: metadata as any
      }
    });

    res.status(201).json({
      status: 'success',
      data: { document }
    });
  } catch (error) {
    next(error);
  }
});

// Get document
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const document = await prisma.document.findFirst({
      where: { id, userId }
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // Get signed URL for document
    const url = await storageService.getSignedUrl(document.storageKey, 3600);

    res.json({
      status: 'success',
      data: { 
        document: {
          ...document,
          url
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update reading progress
router.patch('/:id/progress', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { currentPage, currentChapter, scrollPosition, progressPercent } = req.body;

    const document = await prisma.document.update({
      where: { id },
      data: {
        currentPage,
        currentChapter,
        scrollPosition,
        progressPercent,
        lastReadAt: new Date()
      }
    });

    res.json({
      status: 'success',
      data: { document }
    });
  } catch (error) {
    next(error);
  }
});

// Delete document
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const document = await prisma.document.findFirst({
      where: { id, userId }
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // Delete from storage
    await storageService.deleteFile(document.storageKey);

    // Delete from database
    await prisma.document.delete({ where: { id } });

    res.json({ status: 'success', message: 'Document deleted' });
  } catch (error) {
    next(error);
  }
});

export { router as documentsRouter };
