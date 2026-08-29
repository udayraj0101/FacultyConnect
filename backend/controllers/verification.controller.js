import * as verificationService from '../services/verification.service.js';
import { verifyIssnQuerySchema, opportunityVerificationSchema } from '../schemas/verification.schema.js';

export function verifyIssnHandler(req, res) {
  const parsed = verifyIssnQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details },
    });
  }
  const result = verificationService.verifyIssn(parsed.data.issn);
  return res.status(200).json(result);
}

export async function updateOpportunityVerificationHandler(req, res) {
  const parsed = opportunityVerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const opp = await verificationService.setOpportunityVerification(req.params.id, parsed.data);
    return res.status(200).json({ opportunity: opp.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'VERIFICATION_UPDATE_FAILED', message: error.message },
    });
  }
}
