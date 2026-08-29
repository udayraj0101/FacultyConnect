import { Faculty } from '../models/Faculty.js';
import { Institution } from '../models/Institution.js';
import { Opportunity } from '../models/Opportunity.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { Publication } from '../models/Publication.js';
import { VerificationRequest } from '../models/VerificationRequest.js';

export async function getPlatformOverview() {
  const [
    totalInstitutions,
    totalFaculty,
    totalOpportunities,
    totalJobs,
    totalApplications,
    totalPublications,
    verifiedInsts,
    pendingVerifications,
    approvedVerifications,
    rejectedVerifications,
    facultyByRole,
    instBySubscription,
    oppsByType,
    oppsByBadge,
    recentInstitutions,
  ] = await Promise.all([
    Institution.countDocuments({}),
    Faculty.countDocuments({}),
    Opportunity.countDocuments({ status: 'live' }),
    Job.countDocuments({ status: 'open' }),
    Application.countDocuments({}),
    Publication.countDocuments({}),
    Institution.countDocuments({ verificationStatus: 'verified' }),
    VerificationRequest.countDocuments({ status: 'pending' }),
    VerificationRequest.countDocuments({ status: 'approved' }),
    VerificationRequest.countDocuments({ status: 'rejected' }),
    Faculty.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Institution.aggregate([{ $group: { _id: '$subscriptionTier', count: { $sum: 1 } } }]),
    Opportunity.aggregate([
      { $match: { status: 'live' } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Opportunity.aggregate([
      { $match: { status: 'live' } },
      { $group: { _id: '$verificationBadge', count: { $sum: 1 } } },
    ]),
    Institution.find({}).sort({ createdAt: -1 }).limit(5).select('name domain verificationStatus subscriptionTier createdAt'),
  ]);

  const groupCountsToObject = arr => {
    const out = {};
    for (const row of arr) out[row._id] = row.count;
    return out;
  };

  return {
    counts: {
      institutions: totalInstitutions,
      faculty: totalFaculty,
      opportunities: totalOpportunities,
      jobs: totalJobs,
      applications: totalApplications,
      publications: totalPublications,
    },
    verifications: {
      pending: pendingVerifications,
      approved: approvedVerifications,
      rejected: rejectedVerifications,
    },
    institutionHealth: {
      verified: verifiedInsts,
      unverified: totalInstitutions - verifiedInsts,
    },
    breakdowns: {
      facultyByRole: groupCountsToObject(facultyByRole),
      institutionBySubscription: groupCountsToObject(instBySubscription),
      opportunitiesByType: groupCountsToObject(oppsByType),
      opportunitiesByBadge: groupCountsToObject(oppsByBadge),
    },
    recentInstitutions: recentInstitutions.map(i => ({
      id: i._id.toString(),
      name: i.name,
      domain: i.domain,
      verificationStatus: i.verificationStatus,
      subscriptionTier: i.subscriptionTier,
      createdAt: i.createdAt,
    })),
  };
}

export async function getCollegeAdminOverview(requesterId) {
  const requester = await Faculty.findById(requesterId);
  if (!requester?.institutionId) {
    const err = new Error('No institution linked to your account');
    err.code = 'NO_INSTITUTION';
    err.status = 400;
    throw err;
  }
  const institution = await Institution.findById(requester.institutionId);
  if (!institution) {
    const err = new Error('Institution not found');
    err.code = 'INSTITUTION_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const [
    totalJobs,
    openJobs,
    closedJobs,
    applicationsByStatus,
    facultyLinked,
    recentJobs,
  ] = await Promise.all([
    Job.countDocuments({ institutionId: institution._id }),
    Job.countDocuments({ institutionId: institution._id, status: 'open' }),
    Job.countDocuments({ institutionId: institution._id, status: 'closed' }),
    Application.aggregate([
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'job',
        },
      },
      { $unwind: '$job' },
      { $match: { 'job.institutionId': institution._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Faculty.countDocuments({ institutionId: institution._id }),
    Job.find({ institutionId: institution._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title designation department status deadline'),
  ]);

  const appCounts = { applied: 0, shortlisted: 0, interview: 0, closed: 0 };
  for (const row of applicationsByStatus) appCounts[row._id] = row.count;
  const totalApplications = Object.values(appCounts).reduce((a, b) => a + b, 0);

  return {
    institution: {
      id: institution._id.toString(),
      name: institution.name,
      domain: institution.domain,
      verificationStatus: institution.verificationStatus,
      subscriptionTier: institution.subscriptionTier,
    },
    counts: {
      totalJobs,
      openJobs,
      closedJobs,
      totalApplications,
      facultyLinked,
    },
    applicantsBreakdown: appCounts,
    recentJobs: recentJobs.map(j => ({
      id: j._id.toString(),
      title: j.title,
      designation: j.designation,
      department: j.department,
      status: j.status,
      deadline: j.deadline,
    })),
  };
}
