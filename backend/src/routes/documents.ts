import { Router } from 'express';
import fs from 'fs';
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

// Proxy document for CORS-free access
router.get('/:id/content', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const document = await prisma.document.findFirst({
      where: { id, userId }
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // Stream file from storage
    const stream = await storageService.getFileStream(document.storageKey);
    
    // Set appropriate headers for inline display
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.filename)}"`);
    
    // Handle stream errors
    stream.on('error', (err: any) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        next(new AppError(500, 'Error streaming document'));
      }
    });
    
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Extract text from document
router.post('/:id/extract', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const document = await prisma.document.findFirst({
      where: { id, userId }
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // Download file to temp location
    const tempPath = `/tmp/${document.storageKey.replace(/\//g, '-')}`;
    await storageService.downloadFile(document.storageKey, tempPath);

    try {
      // Extract content using new processor
      const content = await documentProcessor.extractStructuredContent(tempPath, document.mimeType);
      
      // Store extracted content in database
      await prisma.document.update({
        where: { id },
        data: {
          extractedText: content.text,
          chunks: content.chunks as any
        }
      });

      // Clean up temp file
      fs.unlinkSync(tempPath);

      res.json({
        status: 'success',
        data: {
          documentId: id,
          textLength: content.text.length,
          chunksCount: content.chunks.length,
          preview: content.text.substring(0, 500) + '...'
        }
      });
    } catch (extractError) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw extractError;
    }
  } catch (error) {
    next(error);
  }
});

// Get extracted text from document
router.get('/:id/text', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
       const { page, format = 'text' } = req.query;

    const document = await prisma.document.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        extractedText: true,
        chunks: true,
        pageCount: true
      }
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // If no extracted text, return error
    if (!document.extractedText) {
      throw new AppError(400, 'Text not extracted yet. Call POST /:id/extract first');
    }

    // Filter by page if requested
    let text = document.extractedText;
    let chunks = document.chunks as any[] || [];
    
    if (page) {
      const pageNum = parseInt(page as string);
      chunks = chunks.filter(c => c.page === pageNum);
    }

    // Format response
    if (format === 'chunks') {
      res.json({
        status: 'success',
        data: {
          documentId: id,
          title: document.title,
          pageCount: document.pageCount,
          chunks
        }
      });
    } else {
      res.json({
        status: 'success',
        data: {
          documentId: id,
          title: document.title,
          pageCount: document.pageCount,
          text,
          wordCount: text.split(/\s+/).length,
          charCount: text.length
        }
      });
    }
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
