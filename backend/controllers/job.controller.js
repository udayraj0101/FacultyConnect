import * as jobService from '../services/job.service.js';
import {
  createJobSchema,
  updateJobSchema,
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
  // Extended to accept 'archived' alongside open/closed so admins can
  // move a posting to the tombstone state from the Job Board too, not
  // just via the dedicated DELETE route.
  const status = req.body?.status;
  if (!['open', 'closed', 'archived'].includes(status)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'status must be open, closed, or archived' },
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

// CA-04 edit route. Partial patch — fields not present stay untouched.
export async function updateJobHandler(req, res) {
  const parsed = updateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const job = await jobService.updateJob(req.params.id, parsed.data, req.user.id);
    return res.status(200).json({ job: job.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'UPDATE_FAILED', message: error.message },
    });
  }
}

// CA-04 delete/archive route. Query param `?hard=true` requests a full
// delete; if applications exist we refuse and surface JOB_HAS_APPLICATIONS
// so the admin archives instead. Default behaviour is archive.
export async function deleteJobHandler(req, res) {
  const hardDelete = String(req.query.hard || '').toLowerCase() === 'true';
  try {
    const result = await jobService.archiveJob(req.params.id, req.user.id, { hardDelete });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'DELETE_FAILED', message: error.message },
    });
  }
}
