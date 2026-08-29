import mongoose from 'mongoose';
import { Faculty } from '../models/Faculty.js';
import { Publication } from '../models/Publication.js';

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
