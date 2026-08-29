import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('crossref');

const BASE = 'https://api.crossref.org';

// Crossref politeness: include a mailto so they can contact us if we misbehave.
const CONTACT = process.env.CROSSREF_CONTACT_EMAIL || 'noreply@facultyconnect.in';
const UA = `FacultyConnect/1.0 (mailto:${CONTACT})`;

function normalizeAuthors(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(a => {
      const given = (a.given || '').trim();
      const family = (a.family || '').trim();
      if (!given && !family) return a.name?.trim() || null;
      return [given, family].filter(Boolean).join(' ');
    })
    .filter(Boolean);
}

export async function fetchByDoi(doi) {
  if (!doi) return null;
  try {
    const response = await axios.get(`${BASE}/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      timeout: 10000,
    });
    const w = response.data?.message;
    if (!w) return null;
    return {
      doi: w.DOI,
      title: Array.isArray(w.title) ? w.title[0] : w.title || null,
      authors: normalizeAuthors(w.author),
      venue: Array.isArray(w['container-title']) ? w['container-title'][0] : w['container-title'] || null,
      publisher: w.publisher || null,
      year:
        w['published-print']?.['date-parts']?.[0]?.[0] ||
        w['published-online']?.['date-parts']?.[0]?.[0] ||
        w.issued?.['date-parts']?.[0]?.[0] ||
        null,
      isbn: w.ISBN || null,
      issn: w.ISSN?.[0] || null,
      referencedByCount: typeof w['is-referenced-by-count'] === 'number' ? w['is-referenced-by-count'] : null,
    };
  } catch (error) {
    if (error.response?.status === 404) return null;
    logger.warn('crossref lookup failed', { doi, status: error.response?.status, message: error.message });
    return null;
  }
}
