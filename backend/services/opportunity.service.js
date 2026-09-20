import { Opportunity } from '../models/Opportunity.js';
import { Faculty } from '../models/Faculty.js';
import { Institution } from '../models/Institution.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('opportunity.service');

const SORT_SPECS = {
  // Freshly-published listings first; tie-break by soonest deadline so the
  // ordering stays stable when multiple listings are posted at once.
  newest: { createdAt: -1, deadline: 1 },
  deadline_asc: { deadline: 1 },
  deadline_desc: { deadline: -1 },
};

export async function listOpportunities(filters) {
  const {
    type,
    mode,
    cost,
    domain,
    indexing,
    deadline_before: deadlineBefore,
    q,
    sort,
    page,
    limit,
    include_expired: includeExpired,
  } = filters;

  const query = { status: 'live' };

  if (type?.length) query.type = { $in: type };
  if (mode) query.mode = mode;
  if (cost === 'free') query.cost = 0;
  if (cost === 'paid') query.cost = { $gt: 0 };

  if (domain?.length) {
    // Case-insensitive tag match
    query.domainTags = { $in: domain.map(d => new RegExp(`^${escapeRegex(d)}$`, 'i')) };
  }

  // Any-match against the multi-select indexing filter. A journal that
  // sits in Scopus AND UGC-CARE Group I hits both filters — no need to
  // AND them, and ANDing would surprise the user (they picked either).
  if (indexing?.length) {
    query.indexing = { $in: indexing };
  }

  const now = new Date();
  if (deadlineBefore) {
    query.deadline = { $gte: now, $lte: deadlineBefore };
  } else if (!includeExpired) {
    query.deadline = { $gte: now };
  }

  if (q) query.$text = { $search: q };

  const sortSpec = SORT_SPECS[sort] || SORT_SPECS.newest;

  const [total, docs] = await Promise.all([
    Opportunity.countDocuments(query),
    Opportunity.find(query)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  return {
    opportunities: docs.map(d => d.toPublicJSON()),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getOpportunityById(id) {
  const opp = await Opportunity.findById(id);
  if (!opp || opp.status !== 'live') {
    const err = new Error('Opportunity not found');
    err.code = 'OPPORTUNITY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return opp;
}

export async function listBookmarks(facultyId) {
  const faculty = await Faculty.findById(facultyId).select('bookmarkedOpportunityIds');
  const ids = faculty?.bookmarkedOpportunityIds || [];
  if (!ids.length) return [];
  const docs = await Opportunity.find({ _id: { $in: ids } }).sort({ deadline: 1 });
  return docs.map(d => d.toPublicJSON());
}

export async function toggleBookmark(facultyId, opportunityId) {
  const opp = await Opportunity.findById(opportunityId);
  if (!opp) {
    const err = new Error('Opportunity not found');
    err.code = 'OPPORTUNITY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const faculty = await Faculty.findById(facultyId);
  const idStr = opportunityId.toString();
  const idx = faculty.bookmarkedOpportunityIds.findIndex(x => x.toString() === idStr);
  let bookmarked;
  if (idx >= 0) {
    faculty.bookmarkedOpportunityIds.splice(idx, 1);
    bookmarked = false;
  } else {
    faculty.bookmarkedOpportunityIds.push(opportunityId);
    bookmarked = true;
  }
  await faculty.save();
  return { bookmarked, bookmarkedOpportunityIds: faculty.bookmarkedOpportunityIds.map(x => x.toString()) };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a new opportunity on behalf of a CollegeAdmin or OpportunityOrganizer.
 * Per PRD §5.4 the actor's institution must be verified before the listing
 * goes live; unverified organizers get their listing parked in pending_review.
 */
export async function createOpportunity({ actor, input }) {
  if (!['CollegeAdmin', 'OpportunityOrganizer'].includes(actor.role)) {
    const err = new Error('Only College Admins and Opportunity Organizers can post listings');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  const actorFaculty = await Faculty.findById(actor.id).select('institutionId');
  if (!actorFaculty?.institutionId) {
    const err = new Error('Your account is not linked to an institution');
    err.code = 'NO_INSTITUTION';
    err.status = 400;
    throw err;
  }
  const institution = await Institution.findById(actorFaculty.institutionId).select(
    'name verificationStatus',
  );
  if (!institution) {
    const err = new Error('Linked institution not found');
    err.code = 'INSTITUTION_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const isVerified = institution.verificationStatus === 'verified';

  // Unverified organizers can still submit — the listing simply goes into
  // pending_review so the Platform Admin can vet the first few before the
  // institution's blanket verification is granted.
  const status = isVerified ? 'live' : 'pending_review';

  const doc = await Opportunity.create({
    type: input.type,
    title: input.title,
    description: input.description,
    domainTags: input.domainTags || [],
    organizerId: institution._id,
    organizerName: institution.name,
    mode: input.mode,
    location: input.location || null,
    cost: input.cost || 0,
    deadline: input.deadline,
    url: input.url || null,
    issn: input.issn || null,
    verificationBadge: 'unverified',
    status,
  });

  logger.info('opportunity created', {
    id: doc._id.toString(),
    type: doc.type,
    status: doc.status,
    organizerId: institution._id.toString(),
    createdBy: actor.id,
  });

  return { opportunity: doc.toPublicJSON(), status };
}

/**
 * List opportunities posted by the actor's institution (any status).
 */
export async function listMyOpportunities({ actor }) {
  const actorFaculty = await Faculty.findById(actor.id).select('institutionId');
  if (!actorFaculty?.institutionId) return { opportunities: [] };
  const docs = await Opportunity.find({ organizerId: actorFaculty.institutionId })
    .sort({ createdAt: -1 })
    .limit(50);
  return {
    opportunities: docs.map(d => ({
      ...d.toPublicJSON(),
      status: d.status,
      createdAt: d.createdAt,
    })),
  };
}
