import { z } from 'zod';
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

// Reject param inputs at the boundary so downstream Mongoose queries never
// throw CastError with ORM internals in the message (see FC-03). Callers
// pass a zod schema shaped like { id: z.string()... }.
export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const details = result.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      logger.warn('param validation failed', { path: req.originalUrl, details });
      return res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid identifier in URL', details },
      });
    }
    // req.params is read-only in Express 5, so mutate individual keys
    // instead of reassigning the object.
    for (const [key, value] of Object.entries(result.data)) {
      req.params[key] = value;
    }
    next();
  };
}

// Shared schema for the common { id: ObjectId } route param.
export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' }),
});
