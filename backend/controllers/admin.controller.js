import * as verificationRequestService from '../services/verification-request.service.js';
import {
  listVerificationsQuerySchema,
  reviewVerificationSchema,
} from '../schemas/verification-request.schema.js';

export async function listVerificationsHandler(req, res) {
  const parsed = listVerificationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details },
    });
  }
  try {
    const result = await verificationRequestService.listRequests(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function reviewVerificationHandler(req, res) {
  const parsed = reviewVerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const doc = await verificationRequestService.reviewRequest(
      req.params.id,
      parsed.data,
      req.user.id,
    );
    return res.status(200).json({ request: doc.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'REVIEW_FAILED', message: error.message },
    });
  }
}
