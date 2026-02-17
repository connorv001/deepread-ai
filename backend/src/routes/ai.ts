import { Router } from 'express';
import { z } from 'zod';
import { prisma, redis } from '../index';
import { AppError } from '../middleware/errorHandler';
import { aiService } from '../services/ai';
import { aiModelFallback } from '../services/aiResilience';
import { logger } from '../utils/logger';

const router = Router();

const summarizeSchema = z.object({
  documentId: z.string(),
  text: z.string().max(100000).optional(),
  type: z.enum(['full', 'selection', 'chapter']),
  pageStart: z.number().optional(),
  pageEnd: z.number().optional(),
  format: z.enum(['paragraph', 'bullet']).default('paragraph')
});

const deepDiveSchema = z.object({
  documentId: z.string(),
  text: z.string(),
  context: z.string().optional()
});

const chatSchema = z.object({
  documentId: z.string(),
  message: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});

// Summarize text
router.post('/summarize', async (req, res, next) => {
  try {
    const params = summarizeSchema.parse(req.body);
    const userId = req.user!.id;

    // Fetch document with extracted text/chunks if no text provided
    let textToSummarize = params.text;
    if (!textToSummarize || params.type === 'full' || params.type === 'chapter') {
      const document = await prisma.document.findFirst({
        where: { id: params.documentId, userId },
        select: { extractedText: true, chunks: true }
      });
      
      // For chapter/page-specific summary, extract from chunks
      if (document?.chunks && Array.isArray(document.chunks) && 
          params.type === 'chapter' && params.pageStart) {
        const pageStart = params.pageStart;
        const pageEnd = params.pageEnd || params.pageStart;
        
        const pageChunks = (document.chunks as any[]).filter(
          (chunk: any) => chunk.page >= pageStart && chunk.page <= pageEnd
        );
        
        textToSummarize = pageChunks.map((c: any) => c.content || c.text).join('\n\n');
        console.log(`Extracted ${pageChunks.length} chunks for pages ${pageStart}-${pageEnd}`);
      } else if (document?.extractedText) {
        textToSummarize = document.extractedText;
      }
    }

    if (!textToSummarize) {
      throw new AppError(400, 'No text available to summarize. Please extract text first.');
    }

    // Check cache
    const cacheKey = `summary:${params.documentId}:${params.type}:${textToSummarize.slice(0, 100) || 'full'}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      const parsed = JSON.parse(cached);
      return res.json({
        status: 'success',
        data: { ...parsed, cached: true }
      });
    }

    // Get user settings for AI model preference
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true }
    });

    const model = user?.settings?.aiModel || 'gpt-4';

    // Generate summary
    const startTime = Date.now();
    const summary = await aiService.summarize({
      text: textToSummarize,
      type: params.type,
      format: params.format,
      model
    });

    const latencyMs = Date.now() - startTime;

    // Save to database
    await prisma.summary.create({
      data: {
        documentId: params.documentId,
        type: params.type.toUpperCase() as any,
        content: summary.content,
        pageStart: params.pageStart,
        pageEnd: params.pageEnd,
        aiModel: model,
        tokensUsed: summary.tokensUsed
      }
    });

    // Save AI request log
    await prisma.aIRequest.create({
      data: {
        userId,
        type: 'SUMMARIZE',
        prompt: params.text?.slice(0, 1000) || 'Full document summary',
        response: summary.content.slice(0, 2000),
        aiModel: model,
        tokensUsed: summary.tokensUsed,
        latencyMs
      }
    });

    // Cache result
    await redis.setex(cacheKey, 86400, JSON.stringify({
      content: summary.content,
      model,
      tokensUsed: summary.tokensUsed
    }));

    res.json({
      status: 'success',
      data: {
        content: summary.content,
        model,
        tokensUsed: summary.tokensUsed,
        cached: false
      }
    });
  } catch (error) {
    next(error);
  }
});

// Deep dive into concepts
router.post('/deep-dive', async (req, res, next) => {
  try {
    const params = deepDiveSchema.parse(req.body);
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true }
    });

    const model = user?.settings?.aiModel || 'gpt-4';

    const startTime = Date.now();
    const result = await aiService.deepDive({
      text: params.text,
      context: params.context,
      model
    });

    const latencyMs = Date.now() - startTime;

    await prisma.aIRequest.create({
      data: {
        userId,
        type: 'DEEP_DIVE',
        prompt: params.text,
        response: JSON.stringify(result),
        aiModel: model,
        tokensUsed: result.tokensUsed,
        latencyMs
      }
    });

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Chat with AI about document
router.post('/chat', async (req, res, next) => {
  try {
    const params = chatSchema.parse(req.body);
    const userId = req.user!.id;

    // Fetch document with extracted text for context
    const document = await prisma.document.findFirst({
      where: { id: params.documentId, userId },
      select: { 
        id: true, 
        title: true, 
        extractedText: true,
        chunks: true
      }
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true }
    });

    const model = user?.settings?.aiModel || 'gpt-4';

    // Build context from extracted text (limit to ~50k chars for context window)
    const documentContext = document.extractedText 
      ? document.extractedText.substring(0, 50000)
      : '';

    const response = await aiService.chat({
      message: params.message,
      history: params.history,
      model,
      documentContext,
      documentTitle: document.title
    });

    await prisma.aIRequest.create({
      data: {
        userId,
        type: 'CHAT',
        prompt: params.message,
        response: response.content,
        aiModel: model,
        tokensUsed: response.tokensUsed
      }
    });

    res.json({
      status: 'success',
      data: response
    });
  } catch (error) {
    next(error);
  }
});

// Stream summarize with Server-Sent Events
router.post('/summarize/stream', async (req, res, next) => {
  try {
    const params = summarizeSchema.parse(req.body);
    const userId = req.user!.id;

    // Fetch document with extracted text/chunks if no text provided
    let textToSummarize = params.text;
    if (!textToSummarize || params.type === 'full' || params.type === 'chapter') {
      const document = await prisma.document.findFirst({
        where: { id: params.documentId, userId },
        select: { extractedText: true, chunks: true }
      });

      // For chapter/page-specific summary, extract from chunks
      if (document?.chunks && Array.isArray(document.chunks) && 
          params.type === 'chapter' && params.pageStart) {
        const pageStart = params.pageStart;
        const pageEnd = params.pageEnd || params.pageStart;
        
        const pageChunks = (document.chunks as any[]).filter(
          (chunk: any) => chunk.page >= pageStart && chunk.page <= pageEnd
        );
        
        textToSummarize = pageChunks.map((c: any) => c.content || c.text).join('\n\n');
        console.log(`Stream: Extracted ${pageChunks.length} chunks for pages ${pageStart}-${pageEnd}`);
      } else if (document?.extractedText) {
        textToSummarize = document.extractedText;
      }
    }

    if (!textToSummarize) {
      throw new AppError(400, 'No text available to summarize. Please extract text first.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true }
    });

    const model = user?.settings?.aiModel || 'gpt-4';

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    let fullContent = '';
    const startTime = Date.now();

    try {
      for await (const chunk of aiService.streamSummarize({
        text: textToSummarize,
        type: params.type,
        format: params.format,
        model
      })) {
        fullContent += chunk;
        // Send SSE event
        res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
      }

      // Send final event
      res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);

      const latencyMs = Date.now() - startTime;

      // Save to database after streaming completes
      await prisma.summary.create({
        data: {
          documentId: params.documentId,
          type: params.type.toUpperCase() as any,
          content: fullContent,
          pageStart: params.pageStart,
          pageEnd: params.pageEnd,
          aiModel: model,
          tokensUsed: Math.ceil(fullContent.length / 4) // Estimate
        }
      });

      await prisma.aIRequest.create({
        data: {
          userId,
          type: 'SUMMARIZE',
          prompt: params.text?.slice(0, 1000) || 'Full document summary',
          response: fullContent.slice(0, 2000),
          aiModel: model,
          tokensUsed: Math.ceil(fullContent.length / 4),
          latencyMs
        }
      });

      res.end();
    } catch (streamError) {
      logger.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed', done: true })}\n\n`);
      res.end();
    }
  } catch (error) {
    next(error);
  }
});

// Stream chat with Server-Sent Events
router.post('/chat/stream', async (req, res, next) => {
  try {
    const params = chatSchema.parse(req.body);
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true }
    });

    const model = user?.settings?.aiModel || 'gpt-4';

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullContent = '';

    try {
      for await (const chunk of aiService.streamChat({
        message: params.message,
        history: params.history,
        model
      })) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);

      // Log request
      await prisma.aIRequest.create({
        data: {
          userId,
          type: 'CHAT',
          prompt: params.message,
          response: fullContent,
          aiModel: model,
          tokensUsed: Math.ceil(fullContent.length / 4)
        }
      });

      res.end();
    } catch (streamError) {
      logger.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed', done: true })}\n\n`);
      res.end();
    }
  } catch (error) {
    next(error);
  }
});

// Health check for AI models
router.get('/health', async (req, res) => {
  const circuitStatus = aiModelFallback.getStatus();
  const allClosed = Object.values(circuitStatus).every(state => state === 'CLOSED');

  res.json({
    status: allClosed ? 'healthy' : 'degraded',
    circuits: circuitStatus,
    timestamp: new Date().toISOString()
  });
});

export { router as aiRouter };
