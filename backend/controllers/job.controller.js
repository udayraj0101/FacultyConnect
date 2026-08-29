import * as jobService from '../services/job.service.js';
import {
  createJobSchema,
  listJobsQuerySchema,
  applicationStatusSchema,
} from '../schemas/job.schema.js';

export async function createHandler(req, res) {
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const job = await jobService.createJob(parsed.data, req.user.id);
    return res.status(201).json({ job: job.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'CREATE_FAILED', message: error.message },
    });
  }
}

export async function listHandler(req, res) {
  const parsed = listJobsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details },
    });
  }
  try {
    const result = await jobService.listJobs(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function detailHandler(req, res) {
  try {
    const job = await jobService.getJobById(req.params.id);
    return res.status(200).json({ job: job.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'DETAIL_FAILED', message: error.message },
    });
  }
}

export async function applyHandler(req, res) {
  try {
    const app = await jobService.apply(req.params.id, req.user.id);
    return res.status(201).json({ application: app.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'APPLY_FAILED', message: error.message },
    });
  }
}

export async function listApplicantsHandler(req, res) {
  try {
    const result = await jobService.listApplicantsForJob(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_APPLICANTS_FAILED', message: error.message },
    });
  }
}

export async function updateApplicationStatusHandler(req, res) {
  const parsed = applicationStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const app = await jobService.updateApplicationStatus(
      req.params.id,
      req.params.appId,
      parsed.data,
      req.user.id,
    );
    return res.status(200).json({ application: app.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'UPDATE_STATUS_FAILED', message: error.message },
    });
  }
}

export async function listMyApplicationsHandler(req, res) {
  try {
    const applications = await jobService.listMyApplications(req.user.id);
    return res.status(200).json({ applications });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function listMyPostingsHandler(req, res) {
  try {
    const jobs = await jobService.listMyInstitutionPostings(req.user.id);
    return res.status(200).json({ jobs });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function setJobStatusHandler(req, res) {
  const status = req.body?.status;
  if (status !== 'open' && status !== 'closed') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'status must be "open" or "closed"' },
    });
  }
  try {
    const job = await jobService.setJobStatus(req.params.id, status, req.user.id);
    return res.status(200).json({ job: job.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'UPDATE_FAILED', message: error.message },
    });
  }
}
