import * as opportunityService from '../services/opportunity.service.js';
import { buildEventIcs } from '../services/ical.service.js';
import {
  listOpportunitiesQuerySchema,
  createOpportunitySchema,
} from '../schemas/opportunity.schema.js';

export async function listHandler(req, res) {
  const parsed = listOpportunitiesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details },
    });
  }
  try {
    // req.user is populated only when a valid Bearer was sent (see
    // optionalAuthenticate). Anonymous callers get the same list without
    // matched-tag chips and with domain_match falling back to newest.
    const result = await opportunityService.listOpportunities(parsed.data, {
      viewerId: req.user?.id || null,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function detailHandler(req, res) {
  try {
    const opp = await opportunityService.getOpportunityById(req.params.id);
    return res.status(200).json({ opportunity: opp.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'DETAIL_FAILED', message: error.message },
    });
  }
}

/**
 * Render one opportunity as an .ics (iCalendar) file. Public — no auth
 * required so a bookmarked ics URL keeps working when a user is signed
 * out. Cache-friendly (5 min) since the calendar clients that fetch
 * these tolerate short staleness far better than a hot-refresh pattern.
 */
export async function icalHandler(req, res) {
  try {
    const opp = await opportunityService.getOpportunityById(req.params.id);
    const host = req.get('host') || 'facultyconnect.in';
    const ics = buildEventIcs(opp, { host });
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    // Downloadable filename slugged from the opportunity title so users
    // browsing their Downloads folder later can tell events apart.
    const slug = String(opp.title || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    res.set(
      'Content-Disposition',
      `attachment; filename="facultyconnect-${slug || 'event'}.ics"`,
    );
    return res.status(200).send(ics);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'ICAL_FAILED', message: error.message },
    });
  }
}

export async function listBookmarksHandler(req, res) {
  try {
    const opportunities = await opportunityService.listBookmarks(req.user.id);
    return res.status(200).json({ opportunities });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function bookmarkHandler(req, res) {
  try {
    const result = await opportunityService.toggleBookmark(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'BOOKMARK_FAILED', message: error.message },
    });
  }
}

export async function createHandler(req, res) {
  const parsed = createOpportunitySchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const result = await opportunityService.createOpportunity({
      actor: req.user,
      input: parsed.data,
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'CREATE_FAILED', message: error.message },
    });
  }
}

export async function listMineHandler(req, res) {
  try {
    const result = await opportunityService.listMyOpportunities({ actor: req.user });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}
