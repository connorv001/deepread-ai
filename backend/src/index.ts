import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fileUpload from 'express-fileupload';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

import { authRouter } from './routes/auth';
import { documentsRouter } from './routes/documents';
import { aiRouter } from './routes/ai';
import { audioRouter } from './routes/audio';
import { libraryRouter } from './routes/library';
import { settingsRouter } from './routes/settings';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { setupAudioQueue } from './services/audioQueue';
import { setupWebSocketHandlers } from './services/websocket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://deepread.ai', 'https://app.deepread.ai']
      : ['http://localhost:3000'],
    credentials: true
  }
});

export const prisma = new PrismaClient();
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://deepread.ai', 'https://app.deepread.ai']
    : ['http://localhost:3000'],
  credentials: true
}));
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

// Protected routes
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
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 DeepRead AI API server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
});
