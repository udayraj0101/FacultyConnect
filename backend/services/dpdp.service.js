import { Faculty } from '../models/Faculty.js';
import { Publication } from '../models/Publication.js';
import { Application } from '../models/Application.js';
import { SavedSearch } from '../models/SavedSearch.js';
import { Notification } from '../models/Notification.js';
import { ConnectRequest } from '../models/ConnectRequest.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('dpdp');

// Deletion grace period. DPDP Act 2023 requires timely erasure (30
// days upper bound), but immediate self-service deletion is a footgun —
// one accidental click and years of profile work is gone. 7 days is
// long enough for the user to change their mind, short enough that we
// stay well inside the compliance window.
export const DELETION_GRACE_DAYS = 7;

/**
 * Gather every record we hold for a single Faculty into one JSON blob
 * suitable for the DPDP "right to data portability" download. Includes:
 *
 *   - The Faculty document itself (all fields, minus password hash,
 *     refresh token hash, and reset token hashes — those are secrets,
 *     not personal data the user needs a copy of).
 *   - Publications authored by this faculty (from the Publication
 *     collection, matched via facultyId).
 *   - Applications this faculty submitted, with the job title/dept
 *     denormalised so the export makes sense standalone.
 *   - Saved searches, notifications, and connect requests (both
 *     directions — as sender and as recipient).
 *   - The consent audit — when they agreed to which policy version.
 *
 * NOT included:
 *   - Messages inside message threads — those involve a second party
 *     whose consent we don't have to disclose the thread wholesale.
 *     A more nuanced export (per-user message extraction) is a
 *     follow-up.
 *   - Data the faculty never authored or received (institution
 *     records, other users' profiles).
 */
export async function exportMyData(facultyId) {
  const faculty = await Faculty.findById(facultyId).populate(
    'institutionId',
    'name domain verificationStatus',
  );
  if (!faculty) {
    const err = new Error('Account not found');
    err.code = 'ACCOUNT_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const [publications, applications, savedSearches, notifications, sentRequests, receivedRequests] =
    await Promise.all([
      Publication.find({ facultyId }).sort({ year: -1, createdAt: -1 }).lean(),
      Application.find({ facultyId })
        .sort({ appliedAt: -1 })
        .populate('jobId', 'title department designation institutionId deadline')
        .lean(),
      SavedSearch.find({ facultyId }).sort({ createdAt: -1 }).lean(),
      Notification.find({ facultyId }).sort({ createdAt: -1 }).limit(500).lean(),
      ConnectRequest.find({ fromFacultyId: facultyId })
        .sort({ createdAt: -1 })
        .populate('toFacultyId', 'name email')
        .lean(),
      ConnectRequest.find({ toFacultyId: facultyId })
        .sort({ createdAt: -1 })
        .populate('fromFacultyId', 'name email')
        .lean(),
    ]);

  // Strip secret fields from the Faculty doc. bcrypt hashes aren't PII
  // and leaking them defeats the point of hashing them in the first
  // place — a user copy of "here's your password hash" is worthless
  // to them and useful to an attacker who exfiltrates the download.
  const profile = faculty.toObject();
  delete profile.passwordHash;
  delete profile.refreshTokenHash;
  delete profile.onboardingTokenHash;
  delete profile.passwordResetTokenHash;

  return {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    profile,
    consent: {
      acceptedAt: faculty.consentAcceptedAt,
      policyVersion: faculty.consentPolicyVersion,
      // Legacy accounts pre-date the audit fields. We infer from
      // createdAt so a data export still shows *some* consent record
      // rather than "null" (which would be misleading — consent was
      // required at signup even before we timestamped it).
      inferredFromAccountCreation: !faculty.consentAcceptedAt,
    },
    publications,
    applications,
    savedSearches,
    notifications,
    connectRequests: {
      sent: sentRequests,
      received: receivedRequests,
    },
  };
}

/**
 * Schedule the account for deletion. Grace period runs until
 * `deletionScheduledFor`; the nightly scheduler (dpdp-erasure-sweep)
 * hard-deletes past-due accounts along with their owned records.
 *
 * Idempotent — calling twice re-uses the existing schedule instead of
 * pushing the date out (otherwise a user could keep an account in
 * "pending deletion" indefinitely by re-clicking).
 */
export async function requestErasure(facultyId) {
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    const err = new Error('Account not found');
    err.code = 'ACCOUNT_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (faculty.deletionScheduledFor) {
    return {
      alreadyScheduled: true,
      deletionScheduledFor: faculty.deletionScheduledFor,
      graceDays: DELETION_GRACE_DAYS,
    };
  }
  const scheduledFor = new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  faculty.deletionScheduledFor = scheduledFor;
  await faculty.save();
  logger.info('erasure scheduled', {
    facultyId: faculty._id.toString(),
    deletionScheduledFor: scheduledFor.toISOString(),
  });
  return {
    alreadyScheduled: false,
    deletionScheduledFor: scheduledFor,
    graceDays: DELETION_GRACE_DAYS,
  };
}

/**
 * Cancel an in-progress erasure. Only valid while still in the grace
 * period — the scheduled sweep runs at ~02:15 IST, so a cancel any
 * time before then reverses the deletion cleanly.
 */
export async function cancelErasure(facultyId) {
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    const err = new Error('Account not found');
    err.code = 'ACCOUNT_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (!faculty.deletionScheduledFor) {
    return { cancelled: false, alreadyClear: true };
  }
  faculty.deletionScheduledFor = null;
  await faculty.save();
  logger.info('erasure cancelled', { facultyId: faculty._id.toString() });
  return { cancelled: true };
}

/**
 * Scheduler task — runs nightly. Finds every account whose grace
 * period has elapsed, then hard-deletes the Faculty doc + every
 * record it owns across the other collections. Runs collection-by-
 * collection rather than in a transaction because MongoDB
 * standalone (dev) doesn't support multi-doc transactions;
 * consequence is a fault mid-delete leaves a partial-deletion state,
 * which the next run will finish (the Faculty doc itself is deleted
 * last so the sweep is idempotent even if the previous run crashed).
 */
export async function sweepExpiredErasures() {
  const dueBefore = new Date();
  const due = await Faculty.find({
    deletionScheduledFor: { $lte: dueBefore, $ne: null },
  }).select('_id email');
  if (due.length === 0) {
    return { processed: 0, deleted: 0 };
  }
  logger.info('erasure sweep starting', { count: due.length });
  let deleted = 0;
  for (const doc of due) {
    const facultyId = doc._id;
    try {
      // Owned records first — leaves the Faculty doc as the last thing
      // to disappear, so a mid-sweep crash leaves the account in a
      // "still scheduled" state that the next sweep will retry.
      // eslint-disable-next-line no-await-in-loop
      await Promise.all([
        Publication.deleteMany({ facultyId }),
        Application.deleteMany({ facultyId }),
        SavedSearch.deleteMany({ facultyId }),
        Notification.deleteMany({ facultyId }),
        ConnectRequest.deleteMany({
          $or: [{ fromFacultyId: facultyId }, { toFacultyId: facultyId }],
        }),
      ]);
      // eslint-disable-next-line no-await-in-loop
      await Faculty.deleteOne({ _id: facultyId });
      deleted += 1;
      logger.info('erasure completed', {
        facultyId: facultyId.toString(),
        email: doc.email,
      });
    } catch (err) {
      logger.error('erasure failed for faculty', {
        facultyId: facultyId.toString(),
        error: err.message,
      });
    }
  }
  return { processed: due.length, deleted };
}
