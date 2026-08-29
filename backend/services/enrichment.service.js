import { Faculty } from '../models/Faculty.js';
import { Publication } from '../models/Publication.js';
import * as crossref from './crossref.service.js';
import * as scopus from './scopus.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('enrichment.service');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function enrichPublicationsWithCrossref(facultyId) {
  const pubs = await Publication.find({ facultyId, doi: { $ne: null } });
  let updated = 0;
  let scanned = 0;
  for (const pub of pubs) {
    scanned += 1;
    const needsAuthors = !pub.authors?.length;
    const needsVenue = !pub.venue;
    const needsYear = !pub.year;
    if (!needsAuthors && !needsVenue && !needsYear) continue;
    const meta = await crossref.fetchByDoi(pub.doi);
    if (!meta) continue;
    let changed = false;
    if (needsAuthors && meta.authors.length) {
      pub.authors = meta.authors;
      changed = true;
    }
    if (needsVenue && meta.venue) {
      pub.venue = meta.venue;
      changed = true;
    }
    if (needsYear && meta.year) {
      pub.year = meta.year;
      changed = true;
    }
    if (changed) {
      await pub.save();
      updated += 1;
    }
    await sleep(100); // politeness delay
  }
  logger.info('crossref enrichment complete', { facultyId, scanned, updated });
  return { scanned, updated };
}

function computeIndices(citationsByPub) {
  const sorted = citationsByPub.slice().sort((a, b) => b - a);
  let h = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i] >= i + 1) h = i + 1;
    else break;
  }
  const i10 = sorted.filter(c => c >= 10).length;
  return { h, i10 };
}

export async function enrichFromScopus(facultyId, scopusAuthorIdOverride) {
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.code = 'FACULTY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const scopusAuthorId = (scopusAuthorIdOverride || faculty.scopusAuthorId || '').trim();
  if (!scopusAuthorId) {
    const err = new Error('Provide a Scopus Author ID first');
    err.code = 'SCOPUS_ID_MISSING';
    err.status = 400;
    throw err;
  }

  let authorMetrics = null;
  let authorRetrievalError = null;
  try {
    authorMetrics = await scopus.fetchAuthorMetrics(scopusAuthorId);
  } catch (err) {
    if (err.code === 'SCOPUS_UNAUTHORIZED') {
      // Free-tier keys don't get Author Retrieval; degrade gracefully by
      // computing h-index / citation total from per-DOI citation counts below.
      authorRetrievalError = err.message;
      logger.info('scopus author retrieval unavailable, using per-DOI fallback', { scopusAuthorId });
    } else {
      throw err;
    }
  }

  const pubs = await Publication.find({ facultyId, doi: { $ne: null } });
  const pubUpdates = [];
  for (const pub of pubs) {
    const cite = await scopus.fetchCitationCountByDoi(pub.doi);
    if (cite != null && cite !== pub.citationCount) {
      pub.citationCount = cite;
      await pub.save();
      pubUpdates.push({ id: pub._id.toString(), citationCount: cite });
    }
    await sleep(150);
  }

  const allPubs = await Publication.find({ facultyId });
  const citations = allPubs.map(p => p.citationCount || 0);
  const { h, i10 } = computeIndices(citations);

  const perDoiTotal = citations.reduce((a, b) => a + b, 0);

  faculty.scopusAuthorId = scopusAuthorId;
  faculty.hIndex = Math.max(authorMetrics?.hIndex || 0, h);
  faculty.i10Index = i10;
  faculty.citationCount = authorMetrics?.citationCount || perDoiTotal;
  await faculty.save();

  logger.info('scopus enrichment complete', {
    facultyId,
    scopusAuthorId,
    hIndex: faculty.hIndex,
    i10Index: faculty.i10Index,
    citationCount: faculty.citationCount,
    publicationsUpdated: pubUpdates.length,
    usedFallback: !authorMetrics,
  });

  return {
    faculty: {
      hIndex: faculty.hIndex,
      i10Index: faculty.i10Index,
      citationCount: faculty.citationCount,
      scopusAuthorId: faculty.scopusAuthorId,
    },
    scopusRaw: authorMetrics,
    authorRetrievalError,
    publicationsUpdated: pubUpdates.length,
    publicationsScanned: pubs.length,
  };
}
