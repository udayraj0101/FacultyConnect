import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('scopus');

function requireEnv() {
  const { ELSEVIER_API_KEY, SCOPUS_API_BASE } = process.env;
  if (!ELSEVIER_API_KEY) {
    const err = new Error('Scopus not configured — set ELSEVIER_API_KEY');
    err.code = 'SCOPUS_NOT_CONFIGURED';
    err.status = 501;
    throw err;
  }
  return {
    key: ELSEVIER_API_KEY,
    base: SCOPUS_API_BASE || 'https://api.elsevier.com',
  };
}

function headers(key) {
  return {
    'X-ELS-APIKey': key,
    Accept: 'application/json',
  };
}

export async function fetchAuthorMetrics(scopusAuthorId) {
  const { key, base } = requireEnv();
  try {
    const response = await axios.get(`${base}/content/author`, {
      params: { author_id: scopusAuthorId, view: 'METRICS' },
      headers: headers(key),
      timeout: 15000,
    });
    const author = response.data?.['author-retrieval-response']?.[0];
    const core = author?.coredata;
    const stats = author?.['h-index'] != null ? author : core;
    // The METRICS view puts h-index directly on the author node.
    const hIndex = author?.['h-index'] != null ? parseInt(author['h-index'], 10) : null;
    const citationCount = core?.['citation-count'] != null ? parseInt(core['citation-count'], 10) : null;
    const docCount = core?.['document-count'] != null ? parseInt(core['document-count'], 10) : null;
    return {
      scopusAuthorId,
      hIndex: Number.isFinite(hIndex) ? hIndex : 0,
      citationCount: Number.isFinite(citationCount) ? citationCount : 0,
      documentCount: Number.isFinite(docCount) ? docCount : 0,
    };
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data;
    logger.warn('scopus author fetch failed', { scopusAuthorId, status, detail });
    if (status === 404 || status === 400) {
      const err = new Error('Scopus author ID not found');
      err.code = 'SCOPUS_AUTHOR_NOT_FOUND';
      err.status = 400;
      throw err;
    }
    if (status === 401 || status === 403) {
      const err = new Error(
        'Scopus refused this request. This can happen on the free tier for author-retrieval calls that require an institutional IP. Try running from a subscribing institution or use a different API key tier.',
      );
      err.code = 'SCOPUS_UNAUTHORIZED';
      err.status = 502;
      throw err;
    }
    const err = new Error('Scopus request failed');
    err.code = 'SCOPUS_REQUEST_FAILED';
    err.status = 502;
    throw err;
  }
}

/**
 * Fetch Scopus quartile + CiteScore metrics for a journal by ISSN.
 *
 * Calls the Serial Title API (`/content/serial/title/issn/{issn}`) which
 * returns the CiteScore year-list along with per-subject-area SNIP / SJR /
 * quartile entries. We flatten to the *primary* subject area (first entry
 * in `subject-area`) and take its latest quartile — that matches what
 * scopus.com surfaces above the fold for the journal.
 *
 * Free-tier keys are eligible for this endpoint as of Elsevier's Dev
 * Portal terms (last checked 2026-09), unlike the author-retrieval
 * METRICS view which needs an institutional IP.
 *
 * Returns `null` when Scopus has no record of the ISSN (404) so the
 * caller can skip that journal without treating it as a hard failure.
 */
export async function fetchJournalMetricsByIssn(issn) {
  const { key, base } = requireEnv();
  const normalised = String(issn || '').trim();
  if (!normalised) return null;
  try {
    const response = await axios.get(
      `${base}/content/serial/title/issn/${encodeURIComponent(normalised)}`,
      {
        params: { view: 'CITESCORE' },
        headers: headers(key),
        timeout: 15000,
      },
    );
    const entry = response.data?.['serial-metadata-response']?.entry?.[0];
    if (!entry) return null;

    const subjectAreas = entry['subject-area'] || [];
    const primarySubject = subjectAreas[0];
    const subjectArea = primarySubject
      ? String(primarySubject['$'] || primarySubject['@abbrev'] || '').trim() || null
      : null;

    // CiteScore blocks: `citeScoreYearInfoList.citeScoreCurrentMetric` is
    // the latest published value; the per-year breakdown sits in
    // `citeScoreYearInfoList.citeScoreYearInfo[]`. Quartile lives inside
    // the subject-area rank arrays, not on the top-level metric.
    const citeScoreInfo = entry.citeScoreYearInfoList;
    const rawCiteScore = citeScoreInfo?.citeScoreCurrentMetric;
    const citeScore = rawCiteScore != null && rawCiteScore !== ''
      ? parseFloat(rawCiteScore)
      : null;

    // The subject-area rank list gives us quartile + percentile. Prefer
    // the primary subject's rank; fall back to the first rank we can find.
    const rankEntries =
      citeScoreInfo?.citeScoreYearInfo?.[0]?.citeScoreInformationList?.[0]
        ?.citeScoreInfoList?.[0]?.rank || [];
    const primaryRank = rankEntries[0] || null;
    const percentileRaw = primaryRank?.percentile;
    const citeScorePercentile = percentileRaw != null && percentileRaw !== ''
      ? parseFloat(percentileRaw)
      : null;
    const quartile = normaliseQuartile(
      primaryRank?.['@type'] || primaryRank?.threshold,
      citeScorePercentile,
    );

    return {
      issn: normalised,
      subjectArea,
      citeScore: Number.isFinite(citeScore) ? citeScore : null,
      citeScorePercentile: Number.isFinite(citeScorePercentile) ? citeScorePercentile : null,
      quartile,
    };
  } catch (error) {
    const status = error.response?.status;
    if (status === 404) return null;
    logger.warn('scopus serial fetch failed', { issn: normalised, status });
    if (status === 401 || status === 403) {
      const err = new Error(
        'Scopus refused the serial-title request. Free-tier keys should work; check ELSEVIER_API_KEY and that the app is registered on the Elsevier Developer Portal.',
      );
      err.code = 'SCOPUS_UNAUTHORIZED';
      err.status = 502;
      throw err;
    }
    const err = new Error('Scopus request failed');
    err.code = 'SCOPUS_REQUEST_FAILED';
    err.status = 502;
    throw err;
  }
}

// Serial Title API returns quartile either as an explicit `Q1`..`Q4`
// literal or via CiteScore percentile. Bucket by percentile using
// Scopus's own definition: Q1 = 75-100th, Q2 = 50-74, Q3 = 25-49, Q4 = 0-24.
function normaliseQuartile(raw, percentile) {
  if (raw && /^Q[1-4]$/i.test(String(raw))) return String(raw).toUpperCase();
  const p = Number(percentile);
  if (!Number.isFinite(p)) return null;
  if (p >= 75) return 'Q1';
  if (p >= 50) return 'Q2';
  if (p >= 25) return 'Q3';
  return 'Q4';
}

export async function fetchCitationCountByDoi(doi) {
  const { key, base } = requireEnv();
  try {
    const response = await axios.get(`${base}/content/abstract/doi/${encodeURIComponent(doi)}`, {
      params: { field: 'citedby-count' },
      headers: headers(key),
      timeout: 15000,
    });
    const core = response.data?.['abstracts-retrieval-response']?.coredata;
    const raw = core?.['citedby-count'];
    const count = raw != null ? parseInt(raw, 10) : null;
    return Number.isFinite(count) ? count : null;
  } catch (error) {
    const status = error.response?.status;
    if (status === 404) return null;
    logger.warn('scopus abstract fetch failed', { doi, status });
    return null;
  }
}
