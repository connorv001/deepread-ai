import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage for correlation ID propagation
export const correlationIdStorage = new AsyncLocalStorage<string>();

/**
 * Middleware to generate and propagate correlation IDs
 * Correlation IDs help trace requests across services and logs
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check for existing correlation ID from upstream (e.g., API Gateway)
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    randomUUID();

  // Set correlation ID in response header for client tracking
  res.setHeader('x-correlation-id', correlationId);

  // Store correlation ID in AsyncLocalStorage for access in nested calls
  correlationIdStorage.run(correlationId, () => {
    // Attach to request object for easy access
    (req as any).correlationId = correlationId;
    next();
  });
}

/**
 * Get the current correlation ID from AsyncLocalStorage
 */
export function getCorrelationId(): string | undefined {
  return correlationIdStorage.getStore();
}
