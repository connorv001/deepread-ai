import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fileUpload from 'express-fileupload';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// NEW: Cookie-based auth routes
import { authRouter } from './routes/auth-cookies';
import { documentsRouter } from './routes/documents';
import { aiRouter } from './routes/ai';
import { audioRouter } from './routes/audio';
import { libraryRouter } from './routes/library';
import { settingsRouter } from './routes/settings';
import { errorHandler } from './middleware/errorHandler';
// NEW: Cookie-based auth middleware
import { authMiddleware } from './middleware/auth-cookies';
import { correlationIdMiddleware } from './middleware/correlationId';
import { setupAudioQueue } from './services/audioQueue';
import { setupWebSocketHandlers } from './services/websocket';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://deepread.ai', 'https://app.deepread.ai', 'https://deepreader.shubham.wtf']
      : ['http://localhost:3000', 'http://localhost:3090'],
    credentials: true // IMPORTANT: Allow cookies
  }
});

export const prisma = new PrismaClient();
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
// Correlation ID tracking (must be first to track all requests)
app.use(correlationIdMiddleware);
// CORS with credentials for cookies
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://deepread.ai', 'https://app.deepread.ai', 'https://deepreader.shubham.wtf']
    : ['http://localhost:3000', 'http://localhost:3090'],
  credentials: true // IMPORTANT: Allow cookies
}));
app.use(cookieParser()); // NEW: Parse cookies
app.use(express.json({ limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRouter);

// Protected routes (now use cookie-based auth)
app.use('/api/documents', authMiddleware, documentsRouter);
app.use('/api/ai', authMiddleware, aiRouter);
app.use('/api/audio', authMiddleware, audioRouter);
app.use('/api/library', authMiddleware, libraryRouter);
app.use('/api/settings', authMiddleware, settingsRouter);

// Error handler
app.use(errorHandler);

// WebSocket setup
setupWebSocketHandlers(io);

// Queue setup
setupAudioQueue();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

httpServer.listen(PORT, () => {
  logger.info(`🚀 DeepRead AI API server running on port ${PORT}`);
  logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔐 Using httpOnly cookie authentication`);
});
