import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupWebSocketHandlers(io: Server): void {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Socket connected: ${socket.id}, user: ${socket.userId}`);

    // Join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Handle document reading room
    socket.on('join-document', (documentId: string) => {
      socket.join(`doc:${documentId}`);
      console.log(`User ${socket.userId} joined document ${documentId}`);
    });

    socket.on('leave-document', (documentId: string) => {
      socket.leave(`doc:${documentId}`);
      console.log(`User ${socket.userId} left document ${documentId}`);
    });

    // Handle progress updates
    socket.on('progress-update', async (data: {
      documentId: string;
      progressPercent: number;
      currentPage: number;
    }) => {
      if (!socket.userId) return;

      try {
        await prisma.document.update({
          where: { id: data.documentId },
          data: {
            progressPercent: data.progressPercent,
            currentPage: data.currentPage,
            lastReadAt: new Date()
          }
        });
      } catch (error) {
        console.error('Progress update error:', error);
      }
    });

    // Handle AI streaming requests
    socket.on('ai-stream', async (data: {
      documentId: string;
      text: string;
      type: 'summarize' | 'deep-dive';
    }) => {
      if (!socket.userId) return;

      // Acknowledge receipt
      socket.emit('ai-stream-start', { requestId: data.documentId });

      // The actual streaming would be handled via the HTTP API
      // This is just for real-time notifications
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 WebSocket handlers initialized');
}

// Helper to broadcast to user's rooms
export function notifyUser(userId: string, event: string, data: any): void {
  // This would be called from other parts of the app
}
