import * as publicationService from '../services/publication.service.js';
import * as enrichmentService from '../services/enrichment.service.js';
import * as scholarCsvService from '../services/scholar-csv.service.js';
import { addPublicationSchema } from '../schemas/faculty.schema.js';

export async function listMyPublicationsHandler(req, res) {
  try {
    const pubs = await publicationService.listByFaculty(req.user.id);
    return res.status(200).json({
      publications: pubs.map(p => p.toPublicJSON()),
      count: pubs.length,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function importOrcidWorksHandler(req, res) {
  try {
    const summary = await publicationService.importFromOrcid(req.user.id);
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'IMPORT_FAILED', message: error.message },
    });
  }
}

export async function enrichCrossrefHandler(req, res) {
  try {
    const summary = await enrichmentService.enrichPublicationsWithCrossref(req.user.id);
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'ENRICH_FAILED', message: error.message },
    });
  }
}

export async function importScholarCsvHandler(req, res) {
  const csv = req.body?.csv;
  if (typeof csv !== 'string' || !csv.trim()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Body must be JSON with a "csv" string field containing the CSV text',
      },
    });
  }
  if (csv.length > 1_000_000) {
    return res.status(413).json({
      error: { code: 'CSV_TOO_LARGE', message: 'CSV exceeds 1 MB limit' },
    });
  }
  try {
    const summary = await scholarCsvService.importFromCsv(req.user.id, csv);
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'IMPORT_FAILED', message: error.message },
    });
  }
}

export async function addManualPublicationHandler(req, res) {
  const parsed = addPublicationSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const pub = await publicationService.addManual(req.user.id, parsed.data);
    return res.status(201).json({ publication: pub.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'ADD_FAILED', message: error.message },
    });
  }
}

export async function deletePublicationHandler(req, res) {
  try {
    const result = await publicationService.remove(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'DELETE_FAILED', message: error.message },
    });
  }
}

export async function importScopusHandler(req, res) {
  const scopusAuthorIdOverride = req.body?.scopusAuthorId;
  if (scopusAuthorIdOverride !== undefined && typeof scopusAuthorIdOverride !== 'string') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'scopusAuthorId must be a string' },
    });
  }
  try {
    const summary = await enrichmentService.enrichFromScopus(
      req.user.id,
      scopusAuthorIdOverride,
    );
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'SCOPUS_ENRICH_FAILED', message: error.message },
    });
  }
}
