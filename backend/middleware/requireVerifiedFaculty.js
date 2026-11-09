import { Faculty } from '../models/Faculty.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('require-verified-faculty');

/**
 * Trust-boundary guard. Blocks faculty actions that imply "this is a
 * confirmed real person affiliated with a real institution" —
 * Directory search, Connect request send, Job apply — until the
 * account has `verificationStatus === 'verified'`.
 *
 * Added per QA report Oct 2026, Critical #6. Previously any new
 * signup (including @example.edu placeholder emails) landed verified
 * and could participate in those trust-minting flows. Fix: default
 * verificationStatus to pending at signup + gate the outbound
 * actions here.
 *
 * Returns 403 FACULTY_NOT_VERIFIED when the viewer is not yet
 * verified so the frontend can render a clear "your account is
 * pending approval" message rather than silently failing.
 */
export async function requireVerifiedFaculty(req, res, next) {
  if (!req.user?.id) {
    return res
      .status(401)
      .json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
  }
  try {
    const faculty = await Faculty.findById(req.user.id).select(
      'verificationStatus role institutionId',
    );
    if (!faculty) {
      return res
        .status(401)
        .json({ error: { code: 'AUTH_REQUIRED', message: 'Account not found' } });
    }
    if (faculty.verificationStatus !== 'verified') {
      logger.info('blocked unverified action', {
        userId: req.user.id,
        status: faculty.verificationStatus,
        path: req.originalUrl,
      });
      return res.status(403).json({
        error: {
          code: 'FACULTY_NOT_VERIFIED',
          message:
            faculty.institutionId
              ? 'Your account is pending approval by your College Admin. You can build your profile while you wait — directory search, connect requests, and job applications unlock once you are verified.'
              : 'Your account is pending approval. Add your institution from your profile, or wait for a Platform Admin review. Directory search, connect requests, and job applications unlock once you are verified.',
        },
      });
    }
    // Pass the loaded doc through so downstream handlers don't re-query.
    req.facultyDoc = faculty;
    next();
  } catch (err) {
    logger.error('verification guard failed', { error: err.message });
    return res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}
