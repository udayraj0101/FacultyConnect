import { Publication } from '../models/Publication.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('scholar-csv');

// Minimal RFC-4180 CSV parser. Handles:
//  - CRLF or LF line endings
//  - Quoted fields containing commas / newlines
//  - Escaped double quotes ("")
//  - Trailing whitespace
// Returns an array of rows; each row is an array of strings.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, ''); // strip BOM
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (c === '\r') {
        // ignore, handled by \n
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => r.some(cell => cell && cell.trim() !== ''));
}

function normalizeHeader(h) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Map many common Google Scholar / Publish or Perish header aliases to
// canonical field names. Return null if no header matched.
const HEADER_MAP = {
  title: 'title',
  articletitle: 'title',
  publicationtitle: 'title',
  author: 'authors',
  authors: 'authors',
  authornames: 'authors',
  year: 'year',
  publicationyear: 'year',
  publishedyear: 'year',
  journal: 'venue',
  journaltitle: 'venue',
  publicationvenue: 'venue',
  source: 'venue',
  venue: 'venue',
  doi: 'doi',
  digitalobjectidentifier: 'doi',
  cites: 'citationCount',
  citationcount: 'citationCount',
  citations: 'citationCount',
  citedby: 'citationCount',
};

function normalizeTitleForKey(title) {
  return title
    .toLowerCase()
    .replace(/[‘’“”]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function splitAuthors(raw) {
  if (!raw) return [];
  return raw
    .split(/[;,]| and /i)
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeDoi(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Strip common URL prefixes
  return trimmed.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '');
}

function parseIntSafe(v) {
  if (v == null) return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

export async function importFromCsv(facultyId, csvText) {
  if (!csvText || !csvText.trim()) {
    const err = new Error('CSV is empty');
    err.code = 'CSV_EMPTY';
    err.status = 400;
    throw err;
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    const err = new Error('CSV must have a header row and at least one data row');
    err.code = 'CSV_NO_ROWS';
    err.status = 400;
    throw err;
  }

  const headerRow = rows[0];
  const columns = headerRow.map(h => HEADER_MAP[normalizeHeader(h)] || null);
  if (!columns.includes('title')) {
    const err = new Error(
      'CSV must have a "Title" column. Recognized headers: Title, Authors, Year, Journal/Venue, DOI, Cites',
    );
    err.code = 'CSV_MISSING_TITLE_COL';
    err.status = 400;
    throw err;
  }

  const dataRows = rows.slice(1);
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const record = {};
    columns.forEach((col, i) => {
      if (col) record[col] = (row[i] || '').trim();
    });

    const title = record.title || '';
    if (!title) {
      skipped += 1;
      continue;
    }
    const doi = normalizeDoi(record.doi);
    const externalId = doi ? `doi:${doi}` : `title:${normalizeTitleForKey(title)}`;
    const authors = splitAuthors(record.authors);
    const year = parseIntSafe(record.year);
    const venue = record.venue || null;
    const citationCount = parseIntSafe(record.citationCount) || 0;

    const result = await Publication.updateOne(
      { facultyId, source: 'scholar_csv', externalId },
      {
        $set: {
          title,
          authors,
          year,
          venue,
          doi: doi || null,
          citationCount,
        },
        $setOnInsert: {
          facultyId,
          source: 'scholar_csv',
          externalId,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount) inserted += 1;
    else if (result.modifiedCount) updated += 1;
  }

  logger.info('scholar csv import complete', {
    facultyId,
    dataRows: dataRows.length,
    inserted,
    updated,
    skipped,
  });

  return {
    dataRows: dataRows.length,
    inserted,
    updated,
    skipped,
    recognizedColumns: columns.filter(Boolean),
  };
}
