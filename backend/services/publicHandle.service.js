import { Faculty } from '../models/Faculty.js';

const MAX_ATTEMPTS = 20;
const MAX_LEN = 40;

/**
 * Convert a display name into a URL-safe slug. Strips honorifics and
 * anything non-alphanumeric. Bounded length so URLs stay reasonable.
 */
export function slugifyName(name) {
  const cleaned = (name || '')
    .toLowerCase()
    .replace(/^(dr|prof|mr|mrs|ms|shri|smt)\.?\s+/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(0, MAX_LEN) || 'faculty';
}

/**
 * Pick a handle that isn't already taken. Tries base first, then base-2,
 * base-3, etc. Falls back to appending short ObjectId prefix if the
 * numeric suffix loop somehow doesn't converge (shouldn't happen at
 * realistic scale, but defensive).
 */
export async function generateUniqueHandle(name, ownFacultyId) {
  const base = slugifyName(name);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const existing = await Faculty.findOne({
      publicHandle: candidate,
      _id: { $ne: ownFacultyId },
    })
      .select('_id')
      .lean();
    if (!existing) return candidate;
  }
  // Fallback — extremely unlikely, but never leave a user without a handle
  return `${base}-${ownFacultyId.toString().slice(-6)}`;
}
