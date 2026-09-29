import mongoose from 'mongoose';
import { Faculty } from '../models/Faculty.js';
import { Publication } from '../models/Publication.js';
import { Institution, slugifyInstitutionName } from '../models/Institution.js';
import { Job } from '../models/Job.js';

const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Look up a Faculty by either MongoDB ObjectId or vanity handle.
 * Returns null if nothing matches — the caller decides how to surface
 * that (typically as an opaque 404 so scrapers can't enumerate).
 */
async function findByHandleOrId(handleOrId) {
  if (mongoose.isValidObjectId(handleOrId)) {
    const doc = await Faculty.findOne({
      _id: handleOrId,
      publicProfileEnabled: true,
      role: 'Faculty',
    }).populate('institutionId', 'name domain verificationStatus');
    if (doc) return doc;
    // Fall through — an ObjectId-shaped string could technically also be
    // a handle in theory, though our slugifier never produces them.
  }
  if (typeof handleOrId === 'string' && HANDLE_PATTERN.test(handleOrId)) {
    return Faculty.findOne({
      publicHandle: handleOrId,
      publicProfileEnabled: true,
      role: 'Faculty',
    }).populate('institutionId', 'name domain verificationStatus');
  }
  return null;
}

/**
 * Returns a public-safe faculty profile for consumption at /f/{handleOrId}.
 *
 * Only returns data when the faculty has explicitly opted in via
 * publicProfileEnabled (DPDP Act 2023 requires explicit consent for
 * public display + indexing). Contact fields (email, phone) are
 * ALWAYS excluded per PRD §3.5 — even the public profile cannot
 * expose them; the connect-request flow is the only path to contact.
 *
 * On denial we return NOT_FOUND rather than FORBIDDEN so scrapers
 * can't enumerate which IDs exist behind the opt-in gate.
 */
export async function getPublicProfile(handleOrId) {
  const faculty = await findByHandleOrId(handleOrId);
  if (!faculty) {
    const err = new Error('Profile not found');
    err.code = 'PROFILE_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const publications = await Publication.find({ facultyId: faculty._id })
    .sort({ year: -1, createdAt: -1 })
    .limit(20);

  const publicationCount = await Publication.countDocuments({ facultyId: faculty._id });

  const directoryPayload = faculty.toDirectoryJSON();

  return {
    ...directoryPayload,
    publicHandle: faculty.publicHandle || null,
    publicationCount,
    publications: publications.map(p => p.toPublicJSON()),
    isPublic: true,
    updatedAt: faculty.updatedAt,
  };
}

/**
 * Lightweight lookup used by the SSR HTML renderer — same auth
 * constraints, but the caller doesn't need publications preloaded.
 */
export async function findPublicFacultyDoc(handleOrId) {
  return findByHandleOrId(handleOrId);
}

// -------------------------------------------------------------------
// Public institution pages — mirrors the faculty pattern above.
// -------------------------------------------------------------------

/**
 * Look up an Institution by ObjectId or vanity handle. Lazy-migrates
 * verified institutions that pre-date the publicHandle field — first
 * visitor to the page slugifies + saves the handle, so we don't need
 * a separate backfill migration. Denied lookups return null (opaque
 * 404, no enumeration).
 */
async function findInstitutionByHandleOrId(handleOrId) {
  let doc = null;
  if (mongoose.isValidObjectId(handleOrId)) {
    doc = await Institution.findOne({ _id: handleOrId });
  }
  if (!doc && typeof handleOrId === 'string' && HANDLE_PATTERN.test(handleOrId)) {
    doc = await Institution.findOne({ publicHandle: handleOrId });
  }
  if (!doc) return null;

  // Only verified institutions get a public page. Lazy backfill:
  // "no publicHandle" is our "not yet migrated" signal — the field
  // arrived AFTER the initial seed data, so existing verified rows
  // get promoted on first visit. New institutions go through the
  // pre-save hook and never hit this path.
  if (doc.verificationStatus !== 'verified') return null;
  if (!doc.publicHandle) {
    doc.publicHandle = slugifyInstitutionName(doc.name);
    doc.publicProfileEnabled = true;
    await doc.save();
  } else if (!doc.publicProfileEnabled) {
    // Explicit opt-out — institution had a handle but flipped the
    // public flag off. Respect it.
    return null;
  }
  return doc;
}

/**
 * Public institution page payload. Aggregates:
 *   - Institution info (name, domain, branding, verified badge, AISHE)
 *   - Open jobs (top 12, most recent first)
 *   - Verified + directory-visible faculty (top 24 by h-index)
 *   - Roster research rollup (total citations, avg h-index, top domains)
 *
 * Uses the same "verified only" filter for faculty as the research
 * rollup on the CA Overview — keeps the numbers consistent between
 * the admin console and the public page.
 */
export async function getPublicInstitution(handleOrId) {
  const institution = await findInstitutionByHandleOrId(handleOrId);
  if (!institution) {
    const err = new Error('Institution not found');
    err.code = 'INSTITUTION_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const [openJobs, facultyList, researchRollup, topDomains, verifiedFacultyCount] = await Promise.all(
    [
      Job.find({
        institutionId: institution._id,
        status: 'open',
        deadline: { $gte: new Date() },
      })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
      // Faculty listed on the public page are opt-in twice: verified
      // AT the institution + directoryVisible on their own profile.
      // Prevents leaking anyone who's on the roster but doesn't want
      // to be publicly discoverable.
      Faculty.find({
        institutionId: institution._id,
        role: 'Faculty',
        verificationStatus: 'verified',
        directoryVisible: true,
      })
        .sort({ hIndex: -1, citationCount: -1 })
        .limit(24)
        .select('name designation department domainTags citationCount hIndex orcidId publicHandle publicProfileEnabled')
        .lean(),
      Faculty.aggregate([
        {
          $match: {
            institutionId: institution._id,
            role: 'Faculty',
            verificationStatus: 'verified',
          },
        },
        {
          $group: {
            _id: null,
            totalCitations: { $sum: { $ifNull: ['$citationCount', 0] } },
            avgHIndex: { $avg: { $ifNull: ['$hIndex', 0] } },
            maxHIndex: { $max: { $ifNull: ['$hIndex', 0] } },
            totalGrantValue: {
              $sum: { $sum: { $ifNull: ['$grantsReceived.amount', []] } },
            },
          },
        },
      ]),
      Faculty.aggregate([
        {
          $match: {
            institutionId: institution._id,
            role: 'Faculty',
            verificationStatus: 'verified',
          },
        },
        { $unwind: '$domainTags' },
        { $group: { _id: '$domainTags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
      Faculty.countDocuments({
        institutionId: institution._id,
        role: 'Faculty',
        verificationStatus: 'verified',
      }),
    ],
  );

  const rr = researchRollup[0] || {};

  return {
    id: institution._id.toString(),
    name: institution.name,
    domain: institution.domain,
    aisheCode: institution.aisheCode,
    verificationStatus: institution.verificationStatus,
    branding: institution.branding || { logoUrl: null, primaryColor: null },
    publicHandle: institution.publicHandle || null,
    isPublic: true,
    updatedAt: institution.updatedAt,
    stats: {
      verifiedFacultyCount,
      openJobsCount: openJobs.length,
      totalCitations: rr.totalCitations || 0,
      avgHIndex: rr.avgHIndex ? Math.round(rr.avgHIndex * 10) / 10 : 0,
      maxHIndex: rr.maxHIndex || 0,
      totalGrantValue: rr.totalGrantValue || 0,
    },
    topDomains: topDomains.map(d => ({ tag: d._id, count: d.count })),
    openJobs: openJobs.map(j => ({
      id: j._id.toString(),
      title: j.title,
      department: j.department,
      designation: j.designation,
      location: j.location,
      employmentType: j.employmentType,
      deadline: j.deadline,
    })),
    faculty: facultyList.map(f => ({
      id: f._id.toString(),
      name: f.name,
      designation: f.designation,
      department: f.department,
      domainTags: f.domainTags || [],
      citationCount: f.citationCount || 0,
      hIndex: f.hIndex || 0,
      orcidId: f.orcidId,
      // Only include a link target if this specific faculty also
      // opted their own profile in — otherwise the card is display-
      // only. Keeps the two consent gates independent.
      publicHandle: f.publicProfileEnabled ? f.publicHandle : null,
      hasPublicProfile: !!f.publicProfileEnabled,
    })),
  };
}

/**
 * SSR helper — resolves an institution doc for the HTML renderer
 * without loading the full aggregate.
 */
export async function findPublicInstitutionDoc(handleOrId) {
  return findInstitutionByHandleOrId(handleOrId);
}
