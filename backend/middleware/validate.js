import { createLogger } from '../utils/logger.js';

const logger = createLogger('validate');

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      logger.warn('validation failed', { path: req.originalUrl, details });
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details },
      });
    }
    req.body = result.data;
    next();
  };
}
