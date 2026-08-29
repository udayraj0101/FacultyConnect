import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { Institution } from '../models/Institution.js';
import { Faculty } from '../models/Faculty.js';
import { emit as emitNotification } from './notification.service.js';

export async function createJob(payload, postedBy) {
  const faculty = await Faculty.findById(postedBy);
  if (!faculty?.institutionId) {
    const err = new Error('Only college admins linked to an institution can post jobs');
    err.code = 'INSTITUTION_MISSING';
    err.status = 400;
    throw err;
  }
  const inst = await Institution.findById(faculty.institutionId);
  if (!inst || inst.verificationStatus !== 'verified') {
    const err = new Error('Your institution must be verified before posting jobs');
    err.code = 'INSTITUTION_NOT_VERIFIED';
    err.status = 403;
    throw err;
  }
  const job = await Job.create({
    ...payload,
    institutionId: inst._id,
    postedBy,
  });
  return job.populate('institutionId', 'name domain verificationStatus');
}

const JOB_SORT_SPECS = {
  newest: { createdAt: -1, deadline: 1 },
  deadline_asc: { deadline: 1 },
  deadline_desc: { deadline: -1 },
};

export async function listJobs(filters) {
  const {
    q,
    designation,
    domain,
    location,
    institutionId,
    sort,
    include_expired: includeExpired,
    page,
    limit,
  } = filters;

  const query = { status: 'open' };
  if (designation?.length) query.designation = { $in: designation };
  if (institutionId) query.institutionId = institutionId;
  if (location) query.location = { $regex: escapeRegex(location), $options: 'i' };
  if (domain?.length) {
    query.domainTags = { $in: domain.map(d => new RegExp(`^${escapeRegex(d)}$`, 'i')) };
  }
  const now = new Date();
  if (!includeExpired) query.deadline = { $gte: now };
  if (q) query.$text = { $search: q };

  const sortSpec = JOB_SORT_SPECS[sort] || JOB_SORT_SPECS.newest;

  const [total, docs] = await Promise.all([
    Job.countDocuments(query),
    Job.find(query)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('institutionId', 'name domain verificationStatus'),
  ]);

  return {
    jobs: docs.map(d => d.toPublicJSON()),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getJobById(id) {
  const job = await Job.findById(id).populate('institutionId', 'name domain verificationStatus');
  if (!job) {
    const err = new Error('Job not found');
    err.code = 'JOB_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return job;
}

export async function apply(jobId, facultyId) {
  const job = await getJobById(jobId);
  if (job.status !== 'open') {
    const err = new Error('This job is no longer accepting applications');
    err.code = 'JOB_CLOSED';
    err.status = 400;
    throw err;
  }
  if (job.deadline < new Date()) {
    const err = new Error('The application deadline has passed');
    err.code = 'JOB_EXPIRED';
    err.status = 400;
    throw err;
  }
  try {
    const app = await Application.create({ jobId, facultyId, status: 'applied' });
    return app;
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error('You have already applied to this job');
      err.code = 'ALREADY_APPLIED';
      err.status = 409;
      throw err;
    }
    throw error;
  }
}

export async function listApplicantsForJob(jobId, requesterId) {
  const job = await getJobById(jobId);
  const requester = await Faculty.findById(requesterId);
  const isPlatformAdmin = requester?.role === 'PlatformAdmin';
  const ownsJob =
    requester?.role === 'CollegeAdmin' &&
    requester?.institutionId?.toString() === job.institutionId._id.toString();
  if (!isPlatformAdmin && !ownsJob) {
    const err = new Error('You can only view applicants for jobs posted by your institution');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }
  const applications = await Application.find({ jobId })
    .sort({ appliedAt: -1 })
    .populate('facultyId', 'name email designation orcidId domainTags citationCount hIndex');
  return {
    job: job.toPublicJSON(),
    applications: applications.map(a => a.toPublicJSON()),
  };
}

export async function updateApplicationStatus(jobId, applicationId, { status, notes }, requesterId) {
  const job = await getJobById(jobId);
  const requester = await Faculty.findById(requesterId);
  const isPlatformAdmin = requester?.role === 'PlatformAdmin';
  const ownsJob =
    requester?.role === 'CollegeAdmin' &&
    requester?.institutionId?.toString() === job.institutionId._id.toString();
  if (!isPlatformAdmin && !ownsJob) {
    const err = new Error('You can only update applicants for jobs posted by your institution');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }
  const app = await Application.findOne({ _id: applicationId, jobId });
  if (!app) {
    const err = new Error('Application not found for this job');
    err.code = 'APPLICATION_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const previousStatus = app.status;
  app.status = status;
  if (notes !== undefined) app.notes = notes || null;
  await app.save();
  const populated = await app.populate(
    'facultyId',
    'name email designation orcidId domainTags citationCount hIndex',
  );

  // Notify the applicant only when the status actually changed — avoids
  // spam if the admin just clicks the current column repeatedly.
  if (previousStatus !== status) {
    emitNotification({
      facultyId: app.facultyId,
      type: 'application_status_changed',
      title: `Your application status changed to ${status}`,
      body: `${job.title} at ${job.institutionId?.name || 'the college'}`,
      link: '/jobs',
      metadata: { jobId: job._id.toString(), applicationId: app._id.toString(), status },
    });
  }

  return populated;
}

export async function listMyApplications(facultyId) {
  const apps = await Application.find({ facultyId })
    .sort({ appliedAt: -1 })
    .populate({
      path: 'jobId',
      populate: { path: 'institutionId', select: 'name domain verificationStatus' },
    });
  return apps.map(a => ({
    id: a._id.toString(),
    status: a.status,
    appliedAt: a.appliedAt,
    job: a.jobId?.toPublicJSON?.() || null,
  }));
}

export async function listMyInstitutionPostings(requesterId) {
  const requester = await Faculty.findById(requesterId);
  if (!requester?.institutionId) {
    const err = new Error('No institution linked to your account');
    err.code = 'NO_INSTITUTION';
    err.status = 400;
    throw err;
  }
  if (requester.role !== 'CollegeAdmin' && requester.role !== 'PlatformAdmin') {
    const err = new Error('Only college admins can view their postings');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  const results = await Job.aggregate([
    { $match: { institutionId: requester.institutionId } },
    {
      $lookup: {
        from: 'applications',
        localField: '_id',
        foreignField: 'jobId',
        as: 'apps',
      },
    },
    {
      $addFields: {
        applicantsCount: { $size: '$apps' },
        counts: {
          applied: {
            $size: {
              $filter: { input: '$apps', as: 'a', cond: { $eq: ['$$a.status', 'applied'] } },
            },
          },
          shortlisted: {
            $size: {
              $filter: { input: '$apps', as: 'a', cond: { $eq: ['$$a.status', 'shortlisted'] } },
            },
          },
          interview: {
            $size: {
              $filter: { input: '$apps', as: 'a', cond: { $eq: ['$$a.status', 'interview'] } },
            },
          },
          closed: {
            $size: {
              $filter: { input: '$apps', as: 'a', cond: { $eq: ['$$a.status', 'closed'] } },
            },
          },
        },
      },
    },
    { $project: { apps: 0 } },
    { $sort: { createdAt: -1 } },
  ]);

  return results.map(job => ({
    id: job._id.toString(),
    title: job.title,
    department: job.department,
    designation: job.designation,
    location: job.location,
    deadline: job.deadline,
    status: job.status,
    createdAt: job.createdAt,
    applicantsCount: job.applicantsCount,
    counts: job.counts,
  }));
}

export async function setJobStatus(id, status, requesterId) {
  const job = await Job.findById(id);
  if (!job) {
    const err = new Error('Job not found');
    err.code = 'JOB_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const requester = await Faculty.findById(requesterId);
  const isPlatformAdmin = requester?.role === 'PlatformAdmin';
  const ownsJob =
    requester?.role === 'CollegeAdmin' &&
    requester?.institutionId?.toString() === job.institutionId.toString();
  if (!isPlatformAdmin && !ownsJob) {
    const err = new Error('You can only manage jobs posted by your institution');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }
  job.status = status;
  await job.save();
  return job.populate('institutionId', 'name domain verificationStatus');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
