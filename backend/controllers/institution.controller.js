import * as institutionService from '../services/institution.service.js';
import {
  createInstitutionSchema,
  listInstitutionsQuerySchema,
} from '../schemas/institution.schema.js';

export async function createHandler(req, res) {
  const parsed = createInstitutionSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const inst = await institutionService.createInstitution(parsed.data);
    return res.status(201).json({ institution: inst.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'CREATE_FAILED', message: error.message },
    });
  }
}

export async function listHandler(req, res) {
  const parsed = listInstitutionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details },
    });
  }
  try {
    const result = await institutionService.listInstitutions(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function detailHandler(req, res) {
  try {
    const inst = await institutionService.getById(req.params.id);
    return res.status(200).json({ institution: inst.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'DETAIL_FAILED', message: error.message },
    });
  }
}
