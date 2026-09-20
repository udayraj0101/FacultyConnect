import { SavedSearch } from '../models/SavedSearch.js';
import { listOpportunities } from './opportunity.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('saved-search');

// Hard cap so a single power user can't fill the collection with
// hundreds of alerting searches (each of which the cron would run).
// Generous enough for real use — a faculty tracking DST + SERB + DBT
// grants and 3 FDP tags is still well under this.
const MAX_PER_FACULTY = 20;

export async function createSavedSearch(facultyId, input) {
  const existing = await SavedSearch.countDocuments({ facultyId });
  if (existing >= MAX_PER_FACULTY) {
    const err = new Error(
      `You already have ${MAX_PER_FACULTY} saved searches. Delete one before adding another.`,
    );
    err.code = 'SAVED_SEARCH_LIMIT';
    err.status = 400;
    throw err;
  }
  const doc = await SavedSearch.create({
    facultyId,
    name: input.name,
    type: input.type,
    filters: input.filters || {},
    alertsEnabled: input.alertsEnabled ?? true,
  });
  logger.info('saved search created', {
    id: doc._id.toString(),
    facultyId: facultyId.toString?.() || facultyId,
    type: doc.type,
    alerts: doc.alertsEnabled,
  });
  return doc.toPublicJSON();
}

export async function listMine(facultyId) {
  const docs = await SavedSearch.find({ facultyId }).sort({ createdAt: -1 });
  return docs.map(d => d.toPublicJSON());
}

export async function updateMine(facultyId, id, patch) {
  const doc = await SavedSearch.findOne({ _id: id, facultyId });
  if (!doc) {
    const err = new Error('Saved search not found');
    err.code = 'SAVED_SEARCH_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (typeof patch.name === 'string') doc.name = patch.name;
  if (typeof patch.alertsEnabled === 'boolean') doc.alertsEnabled = patch.alertsEnabled;
  await doc.save();
  return doc.toPublicJSON();
}

export async function deleteMine(facultyId, id) {
  const doc = await SavedSearch.findOneAndDelete({ _id: id, facultyId });
  if (!doc) {
    const err = new Error('Saved search not found');
    err.code = 'SAVED_SEARCH_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return { deleted: true };
}

// Run the persisted filters through the standard list endpoint so a
// user landing on /saved-searches/:id sees exactly the same set they'd
// get if they applied the filters manually on Discover.
export async function runSavedSearch(facultyId, id) {
  const doc = await SavedSearch.findOne({ _id: id, facultyId });
  if (!doc) {
    const err = new Error('Saved search not found');
    err.code = 'SAVED_SEARCH_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const filters = {
    ...doc.filters,
    type: [doc.type],
    // Sensible defaults if the persisted filters didn't include them.
    page: 1,
    limit: 20,
    sort: doc.filters?.sort || 'newest',
  };
  const result = await listOpportunities(filters, { viewerId: facultyId });
  return { savedSearch: doc.toPublicJSON(), ...result };
}
