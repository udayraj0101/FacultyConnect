import { Faculty } from '../models/Faculty.js';
import { Publication } from '../models/Publication.js';
import { myConnectionWith } from './connect-request.service.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Directory search. Only returns Faculty with directoryVisible=true. Admin
 * roles (PlatformAdmin, CollegeAdmin) are excluded from the searchable
 * researcher pool. Contact fields (email, phone) never surface here per
 * PRD §3.5 — they're only revealed after a connect request is accepted.
 */
const SORT_MAP = {
  relevance: { hIndex: -1, citationCount: -1 },
  citations: { citationCount: -1, hIndex: -1 },
  hIndex: { hIndex: -1, citationCount: -1 },
  name: { name: 1 },
  // publications is handled specially below since it isn't a Faculty field
};

export async function search(filters, viewerId) {
  const {
    q,
    domain,
    designation,
    institutionId,
    open_to: openTo,
    exclude_same_institution: excludeSameInstitution,
    sort,
    page,
    limit,
  } = filters;

  const query = {
    directoryVisible: true,
    role: 'Faculty',
  };
  // Never return the requester in their own directory results (FC-07).
  if (viewerId) query._id = { $ne: viewerId };
  if (designation) query.designation = designation;
  if (institutionId) query.institutionId = institutionId;
  // Any-match against the multi-select openTo intent flags: "show me
  // faculty open to Co-PI OR PhD-student requests" returns everyone who
  // ticked at least one of the boxes.
  if (openTo?.length) query.openTo = { $in: openTo };
  // Co-PI finder: hide same-institution peers when the deep-link asks
  // for it. Needs a viewer to know what "same institution" means; the
  // service silently ignores when there's no viewer.
  if (excludeSameInstitution && viewerId) {
    const viewer = await Faculty.findById(viewerId).select('institutionId').lean();
    if (viewer?.institutionId) {
      query.institutionId = query.institutionId
        ? query.institutionId
        : { $ne: viewer.institutionId };
    }
  }
  if (domain) {
    query.domainTags = new RegExp(`^${escapeRegex(domain)}$`, 'i');
  }
  if (q) {
    // Case-insensitive substring match over name, domain tags, and bio.
    // MongoDB disallows $text inside $or, so we use regex; fine at seed
    // scale. We'll migrate to Atlas Search once profile count exceeds
    // ~10k per PRD §8.
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ name: rx }, { domainTags: rx }, { bio: rx }];
  }

  // Sort by publications = fetch all matching IDs, sort by pub count in aggregation.
  // For other sorts, do the standard paginated find.
  if (sort === 'publications') {
    return searchWithPublicationSort(query, page, limit);
  }

  const sortSpec = SORT_MAP[sort] || SORT_MAP.relevance;
  const [total, docs] = await Promise.all([
    Faculty.countDocuments(query),
    Faculty.find(query)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('institutionId', 'name verificationStatus'),
  ]);

  const facultyIds = docs.map(d => d._id);
  const pubCounts = await Publication.aggregate([
    { $match: { facultyId: { $in: facultyIds } } },
    { $group: { _id: '$facultyId', count: { $sum: 1 } } },
  ]);
  const pubByFaculty = new Map();
  for (const r of pubCounts) pubByFaculty.set(r._id.toString(), r.count);

  const results = docs.map(d => ({
    ...d.toDirectoryJSON(),
    publicationCount: pubByFaculty.get(d._id.toString()) || 0,
  }));

  return {
    results,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function searchWithPublicationSort(query, page, limit) {
  const total = await Faculty.countDocuments(query);
  // Fetch matching IDs, then compute pub counts, sort, and slice. Only
  // safe at seed scale — for large corpora this would need a materialized
  // publicationCount on Faculty.
  const allDocs = await Faculty.find(query)
    .select('_id')
    .lean();
  const allIds = allDocs.map(d => d._id);
  const pubCounts = await Publication.aggregate([
    { $match: { facultyId: { $in: allIds } } },
    { $group: { _id: '$facultyId', count: { $sum: 1 } } },
  ]);
  const pubByFaculty = new Map();
  for (const r of pubCounts) pubByFaculty.set(r._id.toString(), r.count);

  const orderedIds = allIds
    .map(id => ({ id, count: pubByFaculty.get(id.toString()) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice((page - 1) * limit, page * limit)
    .map(x => x.id);

  const docs = await Faculty.find({ _id: { $in: orderedIds } }).populate(
    'institutionId',
    'name verificationStatus',
  );
  const byId = new Map(docs.map(d => [d._id.toString(), d]));
  const results = orderedIds
    .map(id => byId.get(id.toString()))
    .filter(Boolean)
    .map(d => ({
      ...d.toDirectoryJSON(),
      publicationCount: pubByFaculty.get(d._id.toString()) || 0,
    }));

  return {
    results,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getDirectoryProfile(facultyId, viewerId) {
  const faculty = await Faculty.findOne({
    _id: facultyId,
    directoryVisible: true,
    role: 'Faculty',
  }).populate('institutionId', 'name domain verificationStatus');

  if (!faculty) {
    const err = new Error('Profile not found or not directory-visible');
    err.code = 'PROFILE_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const publications = await Publication.find({ facultyId: faculty._id })
    .sort({ year: -1, createdAt: -1 })
    .limit(20);

  const isSelf = viewerId && viewerId.toString() === facultyId.toString();
  const myConnection = isSelf ? null : await myConnectionWith(viewerId, facultyId);

  return {
    ...faculty.toDirectoryJSON(),
    isSelf,
    publicationCount: await Publication.countDocuments({ facultyId: faculty._id }),
    publications: publications.map(p => p.toPublicJSON()),
    myConnection,
  };
}
