import { Publication } from '../models/Publication.js';
import { Faculty } from '../models/Faculty.js';
import { fetchWorks } from './orcid.service.js';
import { fetchByDoi } from './crossref.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('publication.service');

export async function listByFaculty(facultyId) {
  return Publication.find({ facultyId }).sort({ year: -1, createdAt: -1 });
}

export async function countByFaculty(facultyId) {
  return Publication.countDocuments({ facultyId });
}

export async function importFromOrcid(facultyId) {
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.code = 'FACULTY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (!faculty.orcidId) {
    const err = new Error('Connect ORCID before importing works');
    err.code = 'ORCID_NOT_LINKED';
    err.status = 400;
    throw err;
  }

  const works = await fetchWorks(faculty.orcidId);
  logger.info('fetched works', { facultyId, orcidId: faculty.orcidId, count: works.length });

  let inserted = 0;
  let updated = 0;
  for (const work of works) {
    if (!work.externalId) continue;
    const result = await Publication.updateOne(
      { facultyId, source: 'orcid', externalId: work.externalId },
      {
        $set: {
          title: work.title,
          year: work.year,
          venue: work.venue,
          doi: work.doi,
        },
        $setOnInsert: {
          facultyId,
          source: 'orcid',
          externalId: work.externalId,
          authors: [],
          citationCount: 0,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount) inserted += 1;
    else if (result.modifiedCount) updated += 1;
  }

  return { fetched: works.length, inserted, updated };
}

/**
 * Manually add a publication. If a DOI is supplied and no title, we look
 * up Crossref to fill title/authors/year/venue automatically. Callers can
 * also skip DOI and just pass title + author list for pre-DOI works.
 */
export async function addManual(facultyId, input) {
  let payload = { ...input };
  if (payload.doi && !payload.title) {
    const meta = await fetchByDoi(payload.doi);
    if (!meta || !meta.title) {
      const err = new Error('Could not find that DOI on Crossref. Try entering the details manually.');
      err.code = 'DOI_NOT_FOUND';
      err.status = 404;
      throw err;
    }
    payload = {
      doi: meta.doi,
      title: meta.title,
      authors: meta.authors,
      year: meta.year,
      venue: meta.venue,
    };
  }

  if (!payload.title) {
    const err = new Error('Title is required when no DOI is provided');
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }

  if (payload.doi) {
    const existing = await Publication.findOne({ facultyId, doi: payload.doi });
    if (existing) {
      const err = new Error('That DOI is already in your publication list');
      err.code = 'DUPLICATE_DOI';
      err.status = 409;
      throw err;
    }
  }

  // Payload's `source` lets the UI tag manually-added pubs as coming from
  // a specific provenance (e.g. 'vidwan' for entries the faculty copied
  // from their INFLIBNET Vidwan profile). Defaults to 'manual'. Only the
  // manual-family sources are allowed; ORCID/Scopus/Scholar entries
  // arrive via the dedicated importers.
  const allowedSources = ['manual', 'vidwan'];
  const source = allowedSources.includes(payload.source) ? payload.source : 'manual';

  const doc = await Publication.create({
    facultyId,
    source,
    title: payload.title,
    authors: Array.isArray(payload.authors) ? payload.authors : [],
    year: payload.year ?? null,
    venue: payload.venue || null,
    doi: payload.doi || null,
    citationCount: 0,
  });
  logger.info('publication added', {
    facultyId,
    publicationId: doc._id.toString(),
    source,
  });
  return doc;
}

/**
 * Delete a publication. Faculty can only delete their own, and by policy
 * we only allow removing manual entries — imported publications should be
 * managed at the upstream source (ORCID/Scopus) so re-syncs don't resurrect
 * them unpredictably.
 */
export async function remove(facultyId, publicationId) {
  const pub = await Publication.findOne({ _id: publicationId, facultyId });
  if (!pub) {
    const err = new Error('Publication not found');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  // Faculty-owned sources (manual + vidwan) can be deleted directly.
  // Sync-managed sources (orcid / scopus / scholar_csv) must be removed
  // upstream — otherwise the next sync will resurrect the entry.
  const facultyOwned = ['manual', 'vidwan'];
  if (!facultyOwned.includes(pub.source)) {
    const err = new Error(
      `This entry came from ${pub.source} — remove it at the source, or it will re-appear on next sync.`,
    );
    err.code = 'IMPORTED_PUBLICATION';
    err.status = 400;
    throw err;
  }
  await pub.deleteOne();
  logger.info('manual publication deleted', { facultyId, publicationId });
  return { id: publicationId };
}
