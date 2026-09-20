import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth');

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
  }
  try {
    const token = authHeader.slice(7);
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    next();
  } catch (error) {
    logger.warn('access token invalid', { error: error.message });
    return res.status(401).json({ error: { code: 'TOKEN_INVALID', message: 'Invalid or expired token' } });
  }
}

/**
 * Soft variant of authenticate for routes that are public but want to
 * personalise responses when a viewer is logged in (e.g. discover-feed
 * domain-match sort). Populates req.user on a valid Bearer, skips it
 * silently on missing / expired / malformed tokens. Never 401s.
 */
export function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.slice(7);
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    // Deliberate no-op — expired / bad tokens on a public endpoint are
    // treated as "no viewer" rather than an error.
  }
  next();
}
