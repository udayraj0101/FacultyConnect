import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { runOrcidResync, runUgcCareResync } from '../services/scheduler.service.js';

/**
 * Manual trigger for the scheduled maintenance jobs. Handy for local
 * verification and for admins who need to force a refresh outside the
 * nightly window.
 *
 * Usage:
 *   node scripts/run-scheduled-jobs.js orcid
 *   node scripts/run-scheduled-jobs.js ugccare
 *   node scripts/run-scheduled-jobs.js all
 */
async function run() {
  const which = (process.argv[2] || 'all').toLowerCase();
  await connectDB();

  if (which === 'orcid' || which === 'all') {
    console.log('\n▶ Running ORCID re-sync…');
    const s = await runOrcidResync();
    console.log('  ✓ ORCID:', s);
  }

  if (which === 'ugccare' || which === 'ugc-care' || which === 'all') {
    console.log('\n▶ Running UGC-CARE re-verify…');
    const s = await runUgcCareResync();
    console.log('  ✓ UGC-CARE:', s);
  }

  console.log('\nDone.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
