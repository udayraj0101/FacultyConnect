import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Opportunity } from '../models/Opportunity.js';
import { fetchJournalMetricsByIssn } from '../services/scopus.service.js';
import { createLogger } from '../utils/logger.js';

// Walk every live journal listing with an ISSN and hydrate its Scopus
// quartile + CiteScore metrics. Meant to run on a nightly cron (Wave 17)
// once we're happy with the ingest; for now it's a manual `npm run` so
// we can dry-run against sandbox data first.
//
// Idempotent: re-running against an already-enriched journal will
// overwrite with the latest snapshot — Scopus revises CiteScore yearly.

const logger = createLogger('enrich-journals-scopus');

async function run() {
  await connectDB();

  const journals = await Opportunity.find({
    type: 'journal',
    status: 'live',
    issn: { $ne: null, $exists: true },
  }).select('_id title issn');

  logger.info('enrichment start', { candidateCount: journals.length });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const journal of journals) {
    try {
      const metrics = await fetchJournalMetricsByIssn(journal.issn);
      if (!metrics) {
        skipped += 1;
        logger.info('no scopus record', { id: journal._id.toString(), issn: journal.issn });
        continue;
      }
      await Opportunity.updateOne(
        { _id: journal._id },
        {
          $set: {
            quartile: metrics.quartile,
            citeScore: metrics.citeScore,
            citeScorePercentile: metrics.citeScorePercentile,
            subjectArea: metrics.subjectArea,
          },
        },
      );
      updated += 1;
      logger.info('enriched journal', {
        id: journal._id.toString(),
        issn: journal.issn,
        quartile: metrics.quartile,
        citeScore: metrics.citeScore,
      });
    } catch (err) {
      failed += 1;
      logger.warn('enrichment failed', {
        id: journal._id.toString(),
        issn: journal.issn,
        error: err.message,
      });
    }
  }

  logger.info('enrichment complete', { updated, skipped, failed });
  process.exit(failed > 0 && updated === 0 ? 1 : 0);
}

run().catch(err => {
  logger.error('enrichment fatal', { error: err.message });
  process.exit(1);
});
