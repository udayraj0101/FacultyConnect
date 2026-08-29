import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth');

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn('role denied', { requiredRoles: roles, userRole: req.user?.role || null });
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
    }
    next();
  };
}
