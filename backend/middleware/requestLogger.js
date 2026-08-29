import { randomUUID } from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('http');

export function requestLogger(req, res, next) {
  const startedAt = Date.now();
  req.requestId = randomUUID();

  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    logger.info(`${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      durationMs: duration,
      userId: req.user?.id || null,
    });
  });

  next();
}

export function withLoggedHandler(handlerName, handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      const handlerLogger = createLogger(handlerName);
      handlerLogger.error('request failed', { error: error.message });
      next(error);
    }
  };
}
