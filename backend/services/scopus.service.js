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
