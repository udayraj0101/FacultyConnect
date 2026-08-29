import cron from 'node-cron';
import { Faculty } from '../models/Faculty.js';
import { Opportunity } from '../models/Opportunity.js';
import { importFromOrcid } from './publication.service.js';
import { lookupIssn } from '../data/ugcCareList.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('scheduler');

// ---------------------------------------------------------------
// Job: nightly ORCID re-sync (PRD §4.1, M17)
// Iterates every faculty with an ORCID iD linked and re-fetches
// their works so newly-published papers surface without the user
// having to click "Sync from ORCID" manually.
// ---------------------------------------------------------------
export async function runOrcidResync() {
  const start = Date.now();
  const cursor = Faculty.find({ orcidId: { $ne: null }, role: 'Faculty' })
    .select('_id orcidId email')
    .lean()
    .cursor();

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;

  for await (const doc of cursor) {
    processed += 1;
    try {
      const summary = await importFromOrcid(doc._id);
      totalInserted += summary.inserted || 0;
      totalUpdated += summary.updated || 0;
      succeeded += 1;
      // Politeness: 500ms between calls so we don't hammer ORCID.
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      failed += 1;
      logger.warn('orcid resync failed for faculty', {
        facultyId: doc._id.toString(),
        error: err.message,
      });
    }
  }

  const summary = {
    processed,
    succeeded,
    failed,
    inserted: totalInserted,
    updated: totalUpdated,
    durationMs: Date.now() - start,
  };
  logger.info('orcid resync complete', summary);
  return summary;
}

// ---------------------------------------------------------------
// Job: nightly UGC-CARE + Scopus re-verification (PRD §4.5, M17)
// Walks every live journal opportunity with an ISSN and refreshes
// its verificationBadge + lastVerifiedAgainstUgcCareOn from the
// UGC_CARE_LIST lookup. Also nudges expired listings to `delisted`
// while we're already scanning.
// ---------------------------------------------------------------
export async function runUgcCareResync() {
  const start = Date.now();
  const journals = await Opportunity.find({
    type: 'journal',
    status: 'live',
    issn: { $ne: null },
  }).select('_id issn verificationBadge lastVerifiedAgainstUgcCareOn');

  let scanned = 0;
  let promoted = 0;
  let demoted = 0;
  let unchanged = 0;
  const now = new Date();

  for (const opp of journals) {
    scanned += 1;
    const lookup = lookupIssn(opp.issn);
    const newBadge = lookup.badge;
    if (newBadge !== opp.verificationBadge) {
      if (opp.verificationBadge === 'unverified' && newBadge !== 'unverified') promoted += 1;
      else if (opp.verificationBadge !== 'unverified' && newBadge === 'unverified') demoted += 1;
      opp.verificationBadge = newBadge;
    } else {
      unchanged += 1;
    }
    // Always bump the timestamp — compliance/transparency signal per PRD §4.5.
    opp.lastVerifiedAgainstUgcCareOn = now;
    await opp.save();
  }

  // Also delist any live opportunities whose deadline has passed — small
  // housekeeping so the Discover feed stays clean.
  const delistResult = await Opportunity.updateMany(
    { status: 'live', deadline: { $lt: now } },
    { $set: { status: 'delisted' } },
  );

  const summary = {
    scanned,
    promoted,
    demoted,
    unchanged,
    delistedExpired: delistResult.modifiedCount || 0,
    durationMs: Date.now() - start,
  };
  logger.info('ugc-care resync complete', summary);
  return summary;
}

// ---------------------------------------------------------------
// Registration — called once at server boot when ENABLE_SCHEDULER=true.
// Times are IST (Asia/Kolkata). We use different minutes so both
// jobs don't kick off simultaneously and starve the event loop.
// ---------------------------------------------------------------
export function startScheduler() {
  if (process.env.ENABLE_SCHEDULER !== 'true') {
    logger.info('scheduler disabled (set ENABLE_SCHEDULER=true to enable)');
    return { started: false };
  }

  const timezone = process.env.SCHEDULER_TIMEZONE || 'Asia/Kolkata';

  // 02:00 IST daily — ORCID re-sync
  cron.schedule(
    '0 2 * * *',
    () => {
      logger.info('cron fire: orcid resync');
      runOrcidResync().catch(err =>
        logger.error('orcid resync crashed', { error: err.message, stack: err.stack }),
      );
    },
    { timezone },
  );

  // 02:30 IST daily — UGC-CARE re-verify + delist expired
  cron.schedule(
    '30 2 * * *',
    () => {
      logger.info('cron fire: ugc-care resync');
      runUgcCareResync().catch(err =>
        logger.error('ugc-care resync crashed', { error: err.message, stack: err.stack }),
      );
    },
    { timezone },
  );

  logger.info('scheduler started', { timezone, jobs: ['orcid-resync@02:00', 'ugc-care-resync@02:30'] });
  return { started: true, timezone };
}
