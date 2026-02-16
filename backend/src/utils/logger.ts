import winston from 'winston';
import { getCorrelationId } from '../middleware/correlationId';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Enhanced log format with correlation IDs
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  const correlationId = getCorrelationId();
  const corrId = correlationId ? `[${correlationId.slice(0, 8)}]` : '[--------]';

  // Include metadata if present
  const metaStr = Object.keys(metadata).length > 0
    ? ` ${JSON.stringify(metadata)}`
    : '';

  return `${timestamp} ${corrId} [${level}]: ${stack || message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat)
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Don't log in test environment
if (process.env.NODE_ENV === 'test') {
  logger.silent = true;
}

export default logger;
