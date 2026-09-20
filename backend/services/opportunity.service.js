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

function intersectTags(a, b) {
  if (!a?.length || !b?.length) return [];
  const setA = new Set(a.map(t => String(t).toLowerCase().trim()).filter(Boolean));
  const matched = [];
  const seen = new Set();
  for (const raw of b) {
    const key = String(raw).toLowerCase().trim();
    if (!key || seen.has(key) || !setA.has(key)) continue;
    seen.add(key);
    matched.push(raw);
  }
  return matched;
}

export async function listOpportunities(filters, { viewerId } = {}) {
  const {
    type,
    mode,
    cost,
    domain,
    indexing,
    credit_hours_min: creditHoursMin,
    certificate,
    agency,
    amount_min: amountMin,
    amount_max: amountMax,
    career_stage: careerStage,
    state,
    city,
    cost_max: costMax,
    starts_after: startsAfter,
    starts_before: startsBefore,
    deadline_before: deadlineBefore,
    q,
    sort,
    page,
    limit,
    include_expired: includeExpired,
    include_facets: includeFacets,
  } = filters;

  const query = { status: 'live' };

  if (type?.length) query.type = { $in: type };
  if (mode) query.mode = mode;
  if (cost === 'free') query.cost = 0;
  if (cost === 'paid') query.cost = { $gt: 0 };
  // Registration-fee cap layered on top of the cost enum: `Under Rs. X`
  // filters compose with `Paid` to mean "paid AND at most X". Merges
  // with the existing query.cost object safely when cost is already
  // { $gt: 0 } from the paid path.
  if (Number.isFinite(costMax)) {
    query.cost =
      query.cost && typeof query.cost === 'object' && !Array.isArray(query.cost)
        ? { ...query.cost, $lte: costMax }
        : { $lte: costMax, ...(cost === 'free' ? { $eq: 0 } : {}) };
  }

  // State: any-match against the multi-select. City: case-insensitive
  // substring match so "chennai" matches "Chennai, Tamil Nadu" seeds.
  if (state?.length) query.state = { $in: state };
  if (city) {
    query.city = new RegExp(escapeRegex(city), 'i');
  }

  // Event date-range: match events whose startDate falls in the window.
  // Only listings with a startDate set match — journals + rolling-call
  // grants get filtered out, which is intended for "events in my break"
  // discovery.
  if (startsAfter || startsBefore) {
    const range = {};
    if (startsAfter) range.$gte = startsAfter;
    if (startsBefore) range.$lte = startsBefore;
    query.startDate = range;
  }

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

  // FDP + conference: minimum credit hours the listing must offer.
  if (Number.isFinite(creditHoursMin) && creditHoursMin > 0) {
    query.creditHours = { $gte: creditHoursMin };
  }
  if (certificate === 'true') {
    query.certificateProvided = true;
  } else if (certificate === 'false') {
    query.certificateProvided = false;
  }

  // Grants: any-match on agency + any-match on career stage + ceiling-
  // capped amount. amount_max = "grant ceiling ≤ user's cap" — matches
  // the UI label "Up to Rs. 50 L" as "give me small grants" rather than
  // "give me anything overlapping this range". Grants with no amountMax
  // set are excluded when the user narrows by amount, since an unbounded
  // grant could be any size.
  if (agency?.length) query.agency = { $in: agency };
  if (careerStage?.length) query.careerStage = { $in: careerStage };
  if (Number.isFinite(amountMax)) {
    query.amountMax = { $ne: null, $lte: amountMax };
  }
  if (Number.isFinite(amountMin)) {
    // Optional floor filter for completeness — grants whose ceiling is
    // at least this much (i.e. the grant could award at least amountMin).
    query.amountMax = { ...(query.amountMax || {}), $gte: amountMin };
  }

  const now = new Date();
  if (deadlineBefore) {
    query.deadline = { $gte: now, $lte: deadlineBefore };
  } else if (!includeExpired) {
    query.deadline = { $gte: now };
  }

  if (q) query.$text = { $search: q };

  // Resolve viewer tags once — needed for domain-match sort AND for
  // decorating every response with matchedTags chips, regardless of sort.
  let viewerTags = [];
  if (viewerId) {
    const viewer = await Faculty.findById(viewerId).select('domainTags').lean();
    viewerTags = viewer?.domainTags || [];
  }
  const canDomainMatch = sort === 'domain_match' && viewerTags.length > 0;

  const sortSpec = canDomainMatch
    ? // Domain-match sort re-ranks in memory after the DB fetch (see
      // below), so use newest as the tie-break base ordering here.
      SORT_SPECS.newest
    : SORT_SPECS[sort] || SORT_SPECS.newest;

  let total;
  let docs;
  if (canDomainMatch) {
    // In-memory rank: fetch a bounded candidate window and sort by
    // matched-tag count. Safe at seed + early-prod scale (Discover
    // rarely exceeds a few hundred live listings per type). If the live
    // corpus grows past ~5k, revisit with an aggregation stage that
    // computes the intersection server-side.
    const HARD_CAP = 500;
    const [count, allDocs] = await Promise.all([
      Opportunity.countDocuments(query),
      Opportunity.find(query).sort(sortSpec).limit(HARD_CAP),
    ]);
    total = count;
    const scored = allDocs
      .map(d => ({ doc: d, matched: intersectTags(viewerTags, d.domainTags) }))
      .sort((a, b) => {
        if (b.matched.length !== a.matched.length) {
          return b.matched.length - a.matched.length;
        }
        // Tie-break on createdAt DESC to match the base sort.
        return new Date(b.doc.createdAt) - new Date(a.doc.createdAt);
      });
    docs = scored.slice((page - 1) * limit, page * limit).map(s => s.doc);
  } else {
    [total, docs] = await Promise.all([
      Opportunity.countDocuments(query),
      Opportunity.find(query)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
  }

  // Facet counts. Same base query as the list itself, so numbers reflect
  // what a user would actually see if they added each option to their
  // current filter combo — not the raw corpus total. Simple $group per
  // facet keeps it easy to reason about; if we outgrow this, promote to
  // a single $facet pipeline that returns everything in one round-trip.
  let facets = null;
  if (includeFacets) {
    facets = await computeFacets(query);
  }

  return {
    // matchedTags surfaces on every card whenever the viewer has domain
    // tags — not only under the domain_match sort — so a card can show
    // "Matched: ML, NLP" even when the user is browsing by deadline.
    opportunities: docs.map(d => ({
      ...d.toPublicJSON(),
      matchedTags: viewerTags.length ? intersectTags(viewerTags, d.domainTags) : [],
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    ...(facets ? { facets } : {}),
  };
}

/**
 * Aggregate per-value counts for the multi-select filters that benefit
 * from live counts on the Discover sidebar. Simple $group per facet:
 * mode / cost buckets / indexing (unwind) / agency / careerStage
 * (unwind) / state. Domain / city / cost_max / credit_hours_min are
 * free-text or range filters and don't get facets.
 */
async function computeFacets(baseQuery) {
  const [mode, indexing, agency, careerStage, state, costBuckets] = await Promise.all([
    Opportunity.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$mode', c: { $sum: 1 } } },
    ]),
    Opportunity.aggregate([
      { $match: baseQuery },
      { $unwind: '$indexing' },
      { $group: { _id: '$indexing', c: { $sum: 1 } } },
    ]),
    Opportunity.aggregate([
      { $match: baseQuery },
      { $match: { agency: { $ne: null } } },
      { $group: { _id: '$agency', c: { $sum: 1 } } },
    ]),
    Opportunity.aggregate([
      { $match: baseQuery },
      { $unwind: '$careerStage' },
      { $group: { _id: '$careerStage', c: { $sum: 1 } } },
    ]),
    Opportunity.aggregate([
      { $match: baseQuery },
      { $match: { state: { $ne: null } } },
      { $group: { _id: '$state', c: { $sum: 1 } } },
    ]),
    Opportunity.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          free: { $sum: { $cond: [{ $eq: ['$cost', 0] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $gt: ['$cost', 0] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const toMap = rows => Object.fromEntries(rows.map(r => [r._id, r.c]));
  return {
    mode: toMap(mode),
    indexing: toMap(indexing),
    agency: toMap(agency),
    careerStage: toMap(careerStage),
    state: toMap(state),
    cost: costBuckets[0]
      ? { free: costBuckets[0].free, paid: costBuckets[0].paid }
      : { free: 0, paid: 0 },
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
