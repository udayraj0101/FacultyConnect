import * as service from '../services/report.service.js';
import {
  createReportSchema,
  listReportsQuerySchema,
  reviewReportSchema,
} from '../schemas/report.schema.js';

export async function createHandler(req, res) {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const report = await service.create({ reporterId: req.user.id, ...parsed.data });
    return res.status(201).json({ report });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'CREATE_FAILED', message: error.message },
    });
  }
}

export async function listMineHandler(req, res) {
  try {
    const reports = await service.listMine(req.user.id);
    return res.status(200).json({ reports });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function listForAdminHandler(req, res) {
  const parsed = listReportsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details },
    });
  }
  try {
    const result = await service.listForAdmin(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function reviewHandler(req, res) {
  const parsed = reviewReportSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const report = await service.review({
      reportId: req.params.id,
      viewerId: req.user.id,
      ...parsed.data,
    });
    return res.status(200).json({ report });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'REVIEW_FAILED', message: error.message },
    });
  }
}

export async function summaryHandler(req, res) {
  try {
    const s = await service.summary();
    return res.status(200).json(s);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'SUMMARY_FAILED', message: error.message },
    });
  }
}
